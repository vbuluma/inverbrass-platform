/**
 * Purpose:
 * Orchestrate Stage 1 platform authentication, sessions, and first-login.
 *
 * Design rationale (architecture change):
 * BP-001 Foundation Stabilization Stage 1 requires application-owned auth:
 * Username = Mobile Number, Password = bcrypt hash in PostgreSQL, session =
 * signed HttpOnly cookie. Supabase Auth is no longer the primary mechanism;
 * Supabase remains PostgreSQL / Storage / Realtime infrastructure.
 *
 * Why this diverges from AD-009 ADR-009:
 * ADR-009 delegated credentials to Supabase Auth. Stage 1 roadmap alignment
 * moves the source of truth to PostgreSQL for credentials and sessions.
 *
 * Architecture:
 * UI → Server Actions → AuthService → CredentialService / session cookies → Drizzle
 */

import { eq } from "drizzle-orm";

import {
  LOCKOUT_DURATION_MINUTES,
  LOCKOUT_THRESHOLD,
} from "@/core/auth/constants";
import {
  AUTH_ERROR_CODES,
  AUTH_USER_MESSAGES,
  AuthError,
} from "@/core/auth/errors";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import type { BusinessContextService } from "@/core/auth/services/business-context-service";
import { createCredentialService } from "@/core/auth/services/credential-service";
import type { CredentialService } from "@/core/auth/services/credential-service";
import { createSecurityQuestionService } from "@/core/auth/services/security-question-service";
import type { SecurityQuestionService } from "@/core/auth/services/security-question-service";
import {
  clearAuthSessionCookie,
  getAuthSessionFromCookie,
  setAuthSessionCookie,
} from "@/core/auth/session/auth-session-cookie";
import type {
  AuthSessionUser,
  ClientContext,
  FirstLoginContext,
  FirstLoginPayload,
  FirstLoginResult,
  LoginCredentials,
  LoginResult,
} from "@/core/auth/types";
import { logAuthFailure } from "@/core/auth/utils/auth-stage-log";
import { normalizeMobileNumber } from "@/core/auth/utils/phone-normalizer";
import { loginCredentialsSchema } from "@/core/auth/validators/auth-validators";
import { firstLoginSchema } from "@/core/auth/validators/first-login-validators";
import { AUTHENTICATION_AUDIT_EVENT_TYPES } from "@/core/audit/types";
import { getAuthenticationAuditEmitter } from "@/core/audit/authentication-audit-emitter";
import { getDb } from "@/db/client";
import { platformUser } from "@/db/schema/platform-user";
import { userSecurityProfile } from "@/db/schema/user-security-profile";

type PlatformUserRecord = {
  id: string;
  authUserId: string | null;
  phoneNumber: string | null;
  email: string | null;
  firstName: string;
  lastName: string;
  displayName: string | null;
  staffCode: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  proposedBusinessName: string | null;
};

export class AuthService {
  constructor(
    private readonly credentialService: CredentialService = createCredentialService(),
    private readonly businessContextService: BusinessContextService = createBusinessContextService(),
    private readonly securityQuestionService: SecurityQuestionService = createSecurityQuestionService()
  ) {}

  /**
   * WHAT: Authenticate with mobile + password and establish a platform session.
   * WHY: Stage 1 login uses PostgreSQL credentials — no OTP, SMS, or IdP.
   */
  async login(
    credentials: LoginCredentials,
    clientContext?: ClientContext
  ): Promise<LoginResult> {
    const parsed = loginCredentialsSchema.safeParse(credentials);

    if (!parsed.success) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        AUTH_USER_MESSAGES.INVALID_INPUT
      );
    }

    let phoneNumberE164: string;

    try {
      phoneNumberE164 = normalizeMobileNumber(
        parsed.data.mobileNumber,
        parsed.data.countryCode
      );
    } catch (error) {
      logAuthFailure("Authentication", error, { step: "phone-normalize" });
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        `Enter a valid mobile number for ${parsed.data.countryCode}.`
      );
    }

    const platformUserRecord = await this.loadPlatformUserByPhone(phoneNumberE164);

    if (!platformUserRecord) {
      await getAuthenticationAuditEmitter().emit({
        eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.LOGIN_FAILURE,
        outcome: "FAILURE",
        timestamp: new Date(),
        clientContext,
        metadata: {
          reason: "PLATFORM_USER_NOT_FOUND",
          phoneNumber: phoneNumberE164,
        },
      });

      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        AUTH_USER_MESSAGES.INVALID_CREDENTIALS,
        401
      );
    }

    this.assertAccountIsAccessible(platformUserRecord);

    try {
      const passwordValid = await this.credentialService.verifyUserPassword(
        platformUserRecord.id,
        parsed.data.password
      );

      if (!passwordValid) {
        await this.recordFailedLoginByPhone(phoneNumberE164, clientContext);

        await getAuthenticationAuditEmitter().emit({
          eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.LOGIN_FAILURE,
          outcome: "FAILURE",
          timestamp: new Date(),
          platformUserId: platformUserRecord.id,
          clientContext,
          metadata: {
            reason: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
            phoneNumber: phoneNumberE164,
          },
        });

        throw new AuthError(
          AUTH_ERROR_CODES.INVALID_CREDENTIALS,
          AUTH_USER_MESSAGES.INVALID_CREDENTIALS,
          401
        );
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      logAuthFailure("Authentication", error, {
        platformUserId: platformUserRecord.id,
      });
      throw new AuthError(
        AUTH_ERROR_CODES.PROVIDER_ERROR,
        AUTH_USER_MESSAGES.PROVIDER_ERROR,
        500
      );
    }

    await this.resetLoginFailures(platformUserRecord.id);

    // Session creation — signed HttpOnly cookie.
    try {
      await setAuthSessionCookie(platformUserRecord.id);
    } catch (error) {
      logAuthFailure("Session creation", error, {
        platformUserId: platformUserRecord.id,
      });
      throw new AuthError(
        AUTH_ERROR_CODES.PROVIDER_ERROR,
        AUTH_USER_MESSAGES.PROVIDER_ERROR,
        500
      );
    }

    const sessionUser = this.toAuthSessionUser(platformUserRecord);

    const initialization =
      await this.businessContextService.initializeContextForUser(
        platformUserRecord.id,
        clientContext
      );

    if (platformUserRecord.mustChangePassword) {
      await getAuthenticationAuditEmitter().emit({
        eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.LOGIN_SUCCESS,
        outcome: "SUCCESS",
        timestamp: new Date(),
        platformUserId: platformUserRecord.id,
        businessId: initialization.context?.businessId,
        clientContext,
        metadata: {
          requiresPasswordChange: true,
          hasNoBusinesses: initialization.hasNoBusinesses,
        },
      });

      return {
        user: sessionUser,
        businessContext: initialization.context,
        requiresBusinessSelection: initialization.requiresBusinessSelection,
        requiresPasswordChange: true,
        hasNoBusinesses: initialization.hasNoBusinesses,
      };
    }

    await getAuthenticationAuditEmitter().emit({
      eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.LOGIN_SUCCESS,
      outcome: "SUCCESS",
      timestamp: new Date(),
      platformUserId: platformUserRecord.id,
      businessId: initialization.context?.businessId,
      clientContext,
      metadata: {
        hasNoBusinesses: initialization.hasNoBusinesses,
      },
    });

    await this.updateLastLogin(platformUserRecord.id);

    return {
      user: sessionUser,
      businessContext: initialization.context,
      requiresBusinessSelection: initialization.requiresBusinessSelection,
      requiresPasswordChange: false,
      hasNoBusinesses: initialization.hasNoBusinesses,
    };
  }

  async logout(clientContext?: ClientContext): Promise<void> {
    const session = await getAuthSessionFromCookie();
    const platformUserId = session?.platformUserId;

    await this.businessContextService.clearContext();
    await clearAuthSessionCookie();

    await getAuthenticationAuditEmitter().emit({
      eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.LOGOUT,
      outcome: "SUCCESS",
      timestamp: new Date(),
      platformUserId,
      clientContext,
    });
  }

  /**
   * WHAT: Resolve the authenticated Platform User from the session cookie.
   * WHY: Server guards and pages use PostgreSQL identity, not Supabase Auth.
   */
  async getAuthenticatedUser(): Promise<AuthSessionUser | null> {
    const session = await getAuthSessionFromCookie();

    if (!session) {
      return null;
    }

    const db = getDb();
    const [row] = await db
      .select({
        id: platformUser.id,
        authUserId: platformUser.authUserId,
        phoneNumber: platformUser.phoneNumber,
        email: platformUser.email,
        firstName: platformUser.firstName,
        lastName: platformUser.lastName,
        displayName: platformUser.displayName,
        staffCode: platformUser.staffCode,
        isActive: platformUser.isActive,
        proposedBusinessName: platformUser.proposedBusinessName,
        mustChangePassword: userSecurityProfile.mustChangePassword,
        failedLoginAttempts: userSecurityProfile.failedLoginAttempts,
        lockedUntil: userSecurityProfile.lockedUntil,
      })
      .from(platformUser)
      .leftJoin(
        userSecurityProfile,
        eq(userSecurityProfile.platformUserId, platformUser.id)
      )
      .where(eq(platformUser.id, session.platformUserId))
      .limit(1);

    if (!row) {
      return null;
    }

    return this.toAuthSessionUser({
      id: row.id,
      authUserId: row.authUserId,
      phoneNumber: row.phoneNumber,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: row.displayName,
      staffCode: row.staffCode,
      isActive: row.isActive,
      proposedBusinessName: row.proposedBusinessName,
      mustChangePassword: row.mustChangePassword ?? false,
      failedLoginAttempts: row.failedLoginAttempts ?? 0,
      lockedUntil: row.lockedUntil ?? null,
    });
  }

  async refreshSession(): Promise<void> {
    const session = await getAuthSessionFromCookie();

    if (!session) {
      throw new AuthError(
        AUTH_ERROR_CODES.SESSION_REQUIRED,
        AUTH_USER_MESSAGES.SESSION_REQUIRED,
        401
      );
    }

    await setAuthSessionCookie(session.platformUserId);
  }

  async getFirstLoginContext(): Promise<FirstLoginContext> {
    const user = await this.getAuthenticatedUser();

    if (!user) {
      throw new AuthError(
        AUTH_ERROR_CODES.SESSION_REQUIRED,
        AUTH_USER_MESSAGES.SESSION_REQUIRED,
        401
      );
    }

    if (!user.mustChangePassword) {
      throw new AuthError(
        AUTH_ERROR_CODES.FIRST_LOGIN_NOT_REQUIRED,
        AUTH_USER_MESSAGES.FIRST_LOGIN_NOT_REQUIRED
      );
    }

    const businessContext = await this.businessContextService.getCurrentContext();
    const requiresSecurityQuestion =
      !(await this.securityQuestionService.hasStoredAnswer(user.platformUserId));

    return {
      user,
      businessContext,
      requiresSecurityQuestion,
    };
  }

  async completeFirstLogin(
    payload: FirstLoginPayload,
    clientContext?: ClientContext
  ): Promise<FirstLoginResult> {
    const parsed = firstLoginSchema.safeParse(payload);

    if (!parsed.success) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        parsed.error.issues[0]?.message ?? AUTH_USER_MESSAGES.INVALID_INPUT
      );
    }

    const user = await this.getAuthenticatedUser();

    if (!user) {
      throw new AuthError(
        AUTH_ERROR_CODES.SESSION_REQUIRED,
        AUTH_USER_MESSAGES.SESSION_REQUIRED,
        401
      );
    }

    if (!user.mustChangePassword) {
      throw new AuthError(
        AUTH_ERROR_CODES.FIRST_LOGIN_NOT_REQUIRED,
        AUTH_USER_MESSAGES.FIRST_LOGIN_NOT_REQUIRED
      );
    }

    const requiresSecurityQuestion =
      !(await this.securityQuestionService.hasStoredAnswer(user.platformUserId));

    if (requiresSecurityQuestion) {
      if (!parsed.data.securityQuestionId || !parsed.data.securityAnswer) {
        throw new AuthError(
          AUTH_ERROR_CODES.SECURITY_QUESTION_REQUIRED,
          AUTH_USER_MESSAGES.SECURITY_QUESTION_REQUIRED
        );
      }
    }

    try {
      await this.credentialService.assertPasswordValid(
        user.platformUserId,
        parsed.data.currentPassword
      );
    } catch (error) {
      if (
        error instanceof AuthError &&
        error.code === AUTH_ERROR_CODES.INVALID_CREDENTIALS
      ) {
        throw new AuthError(
          AUTH_ERROR_CODES.CURRENT_PASSWORD_INVALID,
          AUTH_USER_MESSAGES.CURRENT_PASSWORD_INVALID,
          401
        );
      }

      logAuthFailure("Authentication", error, {
        step: "first-login-verify-current",
      });
      throw error;
    }

    const existingBusinessContext =
      await this.businessContextService.getCurrentContext();

    const db = getDb();

    try {
      await db.transaction(async (tx) => {
        if (requiresSecurityQuestion) {
          await this.securityQuestionService.hashAndStoreAnswer(
            user.platformUserId,
            parsed.data.securityQuestionId!,
            parsed.data.securityAnswer!,
            tx
          );
        }

        await this.credentialService.setPasswordHash(
          user.platformUserId,
          parsed.data.newPassword,
          tx
        );

        await tx
          .update(userSecurityProfile)
          .set({
            mustChangePassword: false,
            updatedAt: new Date(),
          })
          .where(eq(userSecurityProfile.platformUserId, user.platformUserId));
      });
    } catch (error) {
      logAuthFailure("Database persistence", error, {
        step: "first-login-persist",
      });
      throw error instanceof AuthError
        ? error
        : new AuthError(
            AUTH_ERROR_CODES.PROVIDER_ERROR,
            AUTH_USER_MESSAGES.PROVIDER_ERROR,
            500
          );
    }

    await this.updateLastLogin(user.platformUserId);

    const refreshedUser = await this.getAuthenticatedUser();

    if (!refreshedUser) {
      logAuthFailure("Session creation", new Error("Session user missing after first login"));
      throw new AuthError(
        AUTH_ERROR_CODES.PROVIDER_ERROR,
        AUTH_USER_MESSAGES.PROVIDER_ERROR,
        500
      );
    }

    let businessContext = existingBusinessContext;
    let requiresBusinessSelection = false;
    let hasNoBusinesses = false;

    if (!businessContext) {
      const initialization =
        await this.businessContextService.initializeContextForUser(
          user.platformUserId,
          clientContext
        );
      businessContext = initialization.context;
      requiresBusinessSelection = initialization.requiresBusinessSelection;
      hasNoBusinesses = initialization.hasNoBusinesses;
    } else {
      const memberships =
        await this.businessContextService.getActiveMemberships(
          user.platformUserId
        );
      hasNoBusinesses = memberships.length === 0;
    }

    const auditTimestamp = new Date();

    await getAuthenticationAuditEmitter().emit({
      eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.PASSWORD_CHANGED,
      outcome: "SUCCESS",
      timestamp: auditTimestamp,
      platformUserId: user.platformUserId,
      businessId: businessContext?.businessId,
      clientContext,
      metadata: { firstLogin: true },
    });

    await getAuthenticationAuditEmitter().emit({
      eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.FIRST_LOGIN_COMPLETED,
      outcome: "SUCCESS",
      timestamp: auditTimestamp,
      platformUserId: user.platformUserId,
      businessId: businessContext?.businessId,
      clientContext,
    });

    return {
      user: refreshedUser,
      businessContext,
      requiresBusinessSelection,
      hasNoBusinesses,
    };
  }

  private async loadPlatformUserByPhone(
    phoneNumberE164: string
  ): Promise<PlatformUserRecord | null> {
    const db = getDb();

    const [row] = await db
      .select({
        id: platformUser.id,
        authUserId: platformUser.authUserId,
        phoneNumber: platformUser.phoneNumber,
        email: platformUser.email,
        firstName: platformUser.firstName,
        lastName: platformUser.lastName,
        displayName: platformUser.displayName,
        staffCode: platformUser.staffCode,
        isActive: platformUser.isActive,
        proposedBusinessName: platformUser.proposedBusinessName,
        mustChangePassword: userSecurityProfile.mustChangePassword,
        failedLoginAttempts: userSecurityProfile.failedLoginAttempts,
        lockedUntil: userSecurityProfile.lockedUntil,
      })
      .from(platformUser)
      .leftJoin(
        userSecurityProfile,
        eq(userSecurityProfile.platformUserId, platformUser.id)
      )
      .where(eq(platformUser.phoneNumber, phoneNumberE164))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      authUserId: row.authUserId,
      phoneNumber: row.phoneNumber,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: row.displayName,
      staffCode: row.staffCode,
      isActive: row.isActive,
      proposedBusinessName: row.proposedBusinessName,
      mustChangePassword: row.mustChangePassword ?? false,
      failedLoginAttempts: row.failedLoginAttempts ?? 0,
      lockedUntil: row.lockedUntil ?? null,
    };
  }

  private assertAccountIsAccessible(user: PlatformUserRecord): void {
    if (!user.isActive) {
      throw new AuthError(
        AUTH_ERROR_CODES.ACCOUNT_DEACTIVATED,
        AUTH_USER_MESSAGES.ACCOUNT_DEACTIVATED,
        403
      );
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new AuthError(
        AUTH_ERROR_CODES.ACCOUNT_LOCKED,
        AUTH_USER_MESSAGES.ACCOUNT_LOCKED,
        423
      );
    }
  }

  private toAuthSessionUser(user: PlatformUserRecord): AuthSessionUser {
    return {
      authUserId: user.authUserId,
      platformUserId: user.id,
      phoneNumber: user.phoneNumber ?? "",
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      staffCode: user.staffCode,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      proposedBusinessName: user.proposedBusinessName,
    };
  }

  private async recordFailedLoginByPhone(
    phoneNumberE164: string,
    clientContext?: ClientContext
  ): Promise<void> {
    const user = await this.loadPlatformUserByPhone(phoneNumberE164);

    if (!user) {
      return;
    }

    const db = getDb();
    const nextAttempts = user.failedLoginAttempts + 1;
    const shouldLock = nextAttempts >= LOCKOUT_THRESHOLD;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
      : null;

    await db
      .insert(userSecurityProfile)
      .values({
        platformUserId: user.id,
        failedLoginAttempts: nextAttempts,
        lockedUntil,
      })
      .onConflictDoUpdate({
        target: userSecurityProfile.platformUserId,
        set: {
          failedLoginAttempts: nextAttempts,
          lockedUntil,
          updatedAt: new Date(),
        },
      });

    if (shouldLock) {
      await getAuthenticationAuditEmitter().emit({
        eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.ACCOUNT_LOCKED,
        outcome: "SUCCESS",
        timestamp: new Date(),
        platformUserId: user.id,
        clientContext,
        metadata: { failedLoginAttempts: nextAttempts },
      });
    }
  }

  private async resetLoginFailures(platformUserId: string): Promise<void> {
    const db = getDb();

    await db
      .insert(userSecurityProfile)
      .values({
        platformUserId,
        failedLoginAttempts: 0,
        lockedUntil: null,
      })
      .onConflictDoUpdate({
        target: userSecurityProfile.platformUserId,
        set: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        },
      });
  }

  private async updateLastLogin(platformUserId: string): Promise<void> {
    const db = getDb();

    await db
      .insert(userSecurityProfile)
      .values({
        platformUserId,
        lastLoginAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userSecurityProfile.platformUserId,
        set: {
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      });
  }
}

export function createAuthService(): AuthService {
  return new AuthService();
}
