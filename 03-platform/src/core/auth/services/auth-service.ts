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
import type {
  AuthSessionUser,
  ClientContext,
  LoginCredentials,
  LoginResult,
} from "@/core/auth/types";
import {
  loginCredentialsSchema,
} from "@/core/auth/validators/auth-validators";
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

export class AuthService {
  constructor(
    private readonly identityProvider: IdentityProviderAdapter = createIdentityProviderAdapter(),
    private readonly businessContextService: BusinessContextService = createBusinessContextService()
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
      await getAuthenticationAuditEmitter().emit({
        eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.LOGIN_SUCCESS,
        outcome: "SUCCESS",
        timestamp: new Date(),
        platformUserId: platformUserRecord.id,
        clientContext,
        metadata: {
          requiresPasswordChange: true,
        },
      });

      return {
        user: sessionUser,
        businessContext: null,
        requiresBusinessSelection: false,
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
