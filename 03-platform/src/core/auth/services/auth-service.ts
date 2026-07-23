import { eq } from "drizzle-orm";

import { createIdentityProviderAdapter } from "@/core/auth/adapters/supabase-identity-provider-adapter";
import type { IdentityProviderAdapter } from "@/core/auth/adapters/identity-provider-adapter";
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
import { createSecurityQuestionService } from "@/core/auth/services/security-question-service";
import type { SecurityQuestionService } from "@/core/auth/services/security-question-service";
import type {
  AuthSessionUser,
  ClientContext,
  FirstLoginContext,
  FirstLoginPayload,
  FirstLoginResult,
  LoginCredentials,
  LoginResult,
} from "@/core/auth/types";
import {
  loginCredentialsSchema,
} from "@/core/auth/validators/auth-validators";
import { firstLoginSchema } from "@/core/auth/validators/first-login-validators";
import {
  normalizeMobileNumber,
  toAuthEmailAlias,
} from "@/core/auth/utils/phone-normalizer";
import {
  AUTHENTICATION_AUDIT_EVENT_TYPES,
} from "@/core/audit/types";
import { getAuthenticationAuditEmitter } from "@/core/audit/authentication-audit-emitter";
import { getDb } from "@/db/client";
import { platformUser } from "@/db/schema/platform-user";
import { userSecurityProfile } from "@/db/schema/user-security-profile";

type PlatformUserRecord = {
  id: string;
  authUserId: string;
  phoneNumber: string | null;
  email: string | null;
  firstName: string;
  lastName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
};

/**
 * Purpose:
 * Orchestrate authentication, session resolution, and first-login password change.
 *
 * Business Context:
 * BP-001 requires secure login/logout, forced first-login password changes for provisioned
 * users, and audit emission without storing credentials in platform tables.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 *
 * Implementation Package:
 * IP-001 (foundation), IP-004 (first login)
 *
 * Responsibilities:
 * - Login and logout orchestration
 * - Authenticated user resolution from Supabase session + platform tables
 * - First-login password change orchestration
 * - Authentication audit event emission
 *
 * Non-Responsibilities:
 * - Owner registration (OnboardingService)
 * - Business context ownership (BusinessContextService)
 * - Security answer hashing (SecurityQuestionService)
 * - Route protection (authenticated-route-guard)
 *
 * Dependencies:
 * - IdentityProviderAdapter, BusinessContextService, SecurityQuestionService
 * - Drizzle ORM platform tables, AuthenticationAuditEmitter
 *
 * Business Rules Implemented:
 * - AD-009 §3.4 — first-login detection and completion
 * - AD-009 §3.5 — login orchestration and lockout handling
 * - ADR-010 — mobile username via E.164 alias
 *
 * Extension Points:
 * - Voluntary password change and recovery delegate to future IP packages
 */
export class AuthService {
  constructor(
    private readonly identityProvider: IdentityProviderAdapter = createIdentityProviderAdapter(),
    private readonly businessContextService: BusinessContextService = createBusinessContextService(),
    private readonly securityQuestionService: SecurityQuestionService = createSecurityQuestionService()
  ) {}

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
    } catch {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        `Enter a valid mobile number for ${parsed.data.countryCode}.`
      );
    }

    const authEmailAlias = toAuthEmailAlias(phoneNumberE164);

    try {
      await this.identityProvider.signInWithPassword({
        authEmailAlias,
        password: parsed.data.password,
      });
    } catch (error) {
      await this.recordFailedLoginByPhone(phoneNumberE164, clientContext);

      if (error instanceof AuthError) {
        await getAuthenticationAuditEmitter().emit({
          eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.LOGIN_FAILURE,
          outcome: "FAILURE",
          timestamp: new Date(),
          clientContext,
          metadata: {
            reason: error.code,
            phoneNumber: phoneNumberE164,
          },
        });
        throw error;
      }

      await getAuthenticationAuditEmitter().emit({
        eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.LOGIN_FAILURE,
        outcome: "FAILURE",
        timestamp: new Date(),
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

    await this.resetLoginFailures(platformUserRecord.id);

    const sessionUser = this.toAuthSessionUser(platformUserRecord);

    if (platformUserRecord.mustChangePassword) {
      const initialization =
        await this.businessContextService.initializeContextForUser(
          platformUserRecord.id,
          clientContext
        );

      await getAuthenticationAuditEmitter().emit({
        eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.LOGIN_SUCCESS,
        outcome: "SUCCESS",
        timestamp: new Date(),
        platformUserId: platformUserRecord.id,
        businessId: initialization.context?.businessId,
        clientContext,
        metadata: {
          requiresPasswordChange: true,
        },
      });

      return {
        user: sessionUser,
        businessContext: initialization.context,
        requiresBusinessSelection: initialization.requiresBusinessSelection,
        requiresPasswordChange: true,
      };
    }

    const initialization =
      await this.businessContextService.initializeContextForUser(
        platformUserRecord.id,
        clientContext
      );

    await getAuthenticationAuditEmitter().emit({
      eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.LOGIN_SUCCESS,
      outcome: "SUCCESS",
      timestamp: new Date(),
      platformUserId: platformUserRecord.id,
      businessId: initialization.context?.businessId,
      clientContext,
    });

    await this.updateLastLogin(platformUserRecord.id);

    return {
      user: sessionUser,
      businessContext: initialization.context,
      requiresBusinessSelection: initialization.requiresBusinessSelection,
      requiresPasswordChange: false,
    };
  }

  async logout(clientContext?: ClientContext): Promise<void> {
    const session = await this.identityProvider.getSession();
    let platformUserId: string | undefined;

    if (session?.user.id) {
      const db = getDb();
      const [row] = await db
        .select({ id: platformUser.id })
        .from(platformUser)
        .where(eq(platformUser.authUserId, session.user.id))
        .limit(1);

      platformUserId = row?.id;
    }

    await this.businessContextService.clearContext();
    await this.identityProvider.signOut();

    await getAuthenticationAuditEmitter().emit({
      eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.LOGOUT,
      outcome: "SUCCESS",
      timestamp: new Date(),
      platformUserId,
      clientContext,
    });
  }

  async getAuthenticatedUser(): Promise<AuthSessionUser | null> {
    const providerUser = await this.identityProvider.getUser();

    if (!providerUser) {
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
        isActive: platformUser.isActive,
        mustChangePassword: userSecurityProfile.mustChangePassword,
        failedLoginAttempts: userSecurityProfile.failedLoginAttempts,
        lockedUntil: userSecurityProfile.lockedUntil,
      })
      .from(platformUser)
      .leftJoin(
        userSecurityProfile,
        eq(userSecurityProfile.platformUserId, platformUser.id)
      )
      .where(eq(platformUser.authUserId, providerUser.authUserId))
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
      isActive: row.isActive,
      mustChangePassword: row.mustChangePassword ?? false,
      failedLoginAttempts: row.failedLoginAttempts ?? 0,
      lockedUntil: row.lockedUntil ?? null,
    });
  }

  async refreshSession(): Promise<void> {
    const session = await this.identityProvider.getSession();

    if (!session) {
      throw new AuthError(
        AUTH_ERROR_CODES.SESSION_REQUIRED,
        AUTH_USER_MESSAGES.SESSION_REQUIRED,
        401
      );
    }
  }

  /**
   * Purpose:
   * Load first-login screen state for an authenticated user.
   *
   * Business Context:
   * The first-login page needs to know whether security question setup is required
   * while preserving the active business context established at login.
   *
   * Inputs:
   * - None — reads the current authenticated session user
   *
   * Outputs:
   * - FirstLoginContext with user, business context, and security question requirement
   *
   * Exceptions:
   * - AuthError when session is missing or first login is not required
   *
   * Business Rules Implemented:
   * - AD-009 §3.4 — security question captured only when not yet configured
   */
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

  /**
   * Purpose:
   * Complete forced first-login password change and optional security question setup.
   *
   * Business Context:
   * Employees provisioned with a temporary password must set a permanent password,
   * configure security Q&A when missing, and continue with uninterrupted business context.
   *
   * Inputs:
   * - payload — current password, new password, optional security Q&A
   * - clientContext — optional request metadata for audit enrichment
   *
   * Outputs:
   * - FirstLoginResult with refreshed user and preserved business context
   *
   * Exceptions:
   * - AuthError for validation, invalid current password, or missing security question
   *
   * Business Rules Implemented:
   * - AD-009 §2.10 — BP-001 password policy
   * - AD-009 §3.4.2 — current password validation and security answer hashing
   * - IP-004 — business context remains active; no re-login required
   */
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

    const authEmailAlias = toAuthEmailAlias(user.phoneNumber);

    try {
      await this.identityProvider.verifyPassword({
        authEmailAlias,
        password: parsed.data.currentPassword,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        throw new AuthError(
          AUTH_ERROR_CODES.CURRENT_PASSWORD_INVALID,
          AUTH_USER_MESSAGES.CURRENT_PASSWORD_INVALID,
          401
        );
      }

      throw error;
    }

    await this.identityProvider.updatePassword(parsed.data.newPassword);

    const existingBusinessContext =
      await this.businessContextService.getCurrentContext();

    const db = getDb();

    /**
     * Transaction required because security answer insert and must_change_password=false
     * must succeed together. Rollback restores the prior profile row and removes any
     * partial answer insert, keeping user_security_profile as the single source of truth.
     */
    await db.transaction(async (tx) => {
      if (requiresSecurityQuestion) {
        await this.securityQuestionService.hashAndStoreAnswer(
          user.platformUserId,
          parsed.data.securityQuestionId!,
          parsed.data.securityAnswer!,
          tx
        );
      }

      await tx
        .insert(userSecurityProfile)
        .values({
          platformUserId: user.platformUserId,
          mustChangePassword: false,
        })
        .onConflictDoUpdate({
          target: userSecurityProfile.platformUserId,
          set: {
            mustChangePassword: false,
            updatedAt: new Date(),
          },
        });
    });

    await this.updateLastLogin(user.platformUserId);

    const refreshedUser = await this.getAuthenticatedUser();

    if (!refreshedUser) {
      throw new AuthError(
        AUTH_ERROR_CODES.PROVIDER_ERROR,
        AUTH_USER_MESSAGES.PROVIDER_ERROR,
        500
      );
    }

    let businessContext = existingBusinessContext;
    let requiresBusinessSelection = false;

    if (!businessContext) {
      const initialization =
        await this.businessContextService.initializeContextForUser(
          user.platformUserId,
          clientContext
        );
      businessContext = initialization.context;
      requiresBusinessSelection = initialization.requiresBusinessSelection;
    }

    const auditTimestamp = new Date();

    await getAuthenticationAuditEmitter().emit({
      eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.PASSWORD_CHANGED,
      outcome: "SUCCESS",
      timestamp: auditTimestamp,
      platformUserId: user.platformUserId,
      businessId: businessContext?.businessId,
      clientContext,
      metadata: {
        firstLogin: true,
      },
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
        isActive: platformUser.isActive,
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
      isActive: row.isActive,
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
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
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
        metadata: {
          failedLoginAttempts: nextAttempts,
        },
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
