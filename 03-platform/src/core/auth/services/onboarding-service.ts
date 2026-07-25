/**
 * Purpose:
 * Orchestrate Platform Registration — create a Platform User and session only.
 *
 * Design rationale (BP-001 Stage 1):
 * Registration creates ONLY a Platform User with a bcrypt password hash.
 * No Business, membership, industry, template, branch, or configuration.
 * Credentials and sessions are platform-owned (PostgreSQL + HttpOnly cookie).
 *
 * Why this exists:
 * Separates identity provisioning from Tenant Business registration.
 */

import { and, eq, sql } from "drizzle-orm";

import {
  AUTH_ERROR_CODES,
  AUTH_USER_MESSAGES,
  AuthError,
} from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import type { AuthService } from "@/core/auth/services/auth-service";
import { createSecurityQuestionService } from "@/core/auth/services/security-question-service";
import type { SecurityQuestionService } from "@/core/auth/services/security-question-service";
import { setAuthSessionCookie } from "@/core/auth/session/auth-session-cookie";
import type {
  ClientContext,
  OwnerRegistrationPayload,
  OwnerRegistrationResult,
} from "@/core/auth/types";
import { logAuthFailure } from "@/core/auth/utils/auth-stage-log";
import { hashPassword } from "@/core/auth/utils/password-hasher";
import { normalizeMobileNumber } from "@/core/auth/utils/phone-normalizer";
import { ownerRegistrationSchema } from "@/core/auth/validators/registration-validators";
import { AUTHENTICATION_AUDIT_EVENT_TYPES } from "@/core/audit/types";
import { getAuthenticationAuditEmitter } from "@/core/audit/authentication-audit-emitter";
import { getDb } from "@/db/client";
import { country } from "@/db/schema/country";
import { platformUser } from "@/db/schema/platform-user";
import { userSecurityProfile } from "@/db/schema/user-security-profile";

export class OnboardingService {
  constructor(
    private readonly authService: AuthService = createAuthService(),
    private readonly securityQuestionService: SecurityQuestionService = createSecurityQuestionService()
  ) {}

  /**
   * WHAT: Register a Platform User with mobile/password — no Business created.
   * WHY: Business registration begins only after login from Platform Home.
   */
  async registerOwner(
    payload: OwnerRegistrationPayload,
    clientContext?: ClientContext
  ): Promise<OwnerRegistrationResult> {
    const parsed = ownerRegistrationSchema.safeParse(payload);

    if (!parsed.success) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        parsed.error.issues[0]?.message ?? AUTH_USER_MESSAGES.INVALID_INPUT
      );
    }

    const data = parsed.data;

    let ownerPhoneE164: string;

    try {
      ownerPhoneE164 = normalizeMobileNumber(
        data.mobileNumber,
        data.countryCode
      );
    } catch (error) {
      logAuthFailure("Authentication", error, { step: "phone-normalize" });
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        "Enter a valid mobile number for the selected country."
      );
    }

    await this.assertPhoneAvailable(ownerPhoneE164);

    if (data.email && data.email.trim().length > 0) {
      await this.assertEmailAvailable(data.email);
    }

    await this.assertCountryActive(data.countryCode);
    await this.securityQuestionService.assertActiveQuestion(
      data.securityQuestionId
    );

    let platformUserId = "";

    try {
      const passwordHash = await hashPassword(data.password);
      const db = getDb();
      const contactEmail =
        data.email && data.email.trim().length > 0
          ? data.email.trim().toLowerCase()
          : null;
      const proposedName =
        data.businessName && data.businessName.trim().length > 0
          ? data.businessName.trim()
          : null;

      await db.transaction(async (tx) => {
        // Platform User creation — identity only.
        const [createdUser] = await tx
          .insert(platformUser)
          .values({
            authUserId: null,
            firstName: data.firstName,
            lastName: data.lastName,
            displayName: `${data.firstName} ${data.lastName}`.trim(),
            email: contactEmail,
            phoneNumber: ownerPhoneE164,
            proposedBusinessName: proposedName,
            isActive: true,
          })
          .returning({ id: platformUser.id });

        platformUserId = createdUser.id;

        // Persist bcrypt password hash — never plain text.
        await tx.insert(userSecurityProfile).values({
          platformUserId,
          passwordHash,
          mustChangePassword: false,
          failedLoginAttempts: 0,
        });

        // Persist bcrypt security-answer hash — never plain text.
        await this.securityQuestionService.hashAndStoreAnswer(
          platformUserId,
          data.securityQuestionId,
          data.securityAnswer,
          tx
        );
      });
    } catch (error) {
      logAuthFailure(
        error instanceof AuthError &&
          error.code === AUTH_ERROR_CODES.PHONE_ALREADY_REGISTERED
          ? "Platform User creation"
          : "Database persistence",
        error,
        { phoneNumber: ownerPhoneE164 }
      );

      await getAuthenticationAuditEmitter().emit({
        eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.USER_REGISTERED,
        outcome: "FAILURE",
        timestamp: new Date(),
        clientContext,
        metadata: {
          reason:
            error instanceof AuthError ? error.code : "PROVISIONING_FAILED",
          phoneNumber: ownerPhoneE164,
        },
      });

      throw error instanceof AuthError
        ? error
        : new AuthError(
            AUTH_ERROR_CODES.REGISTRATION_FAILED,
            AUTH_USER_MESSAGES.REGISTRATION_FAILED,
            500
          );
    }

    // Session creation after successful persistence.
    try {
      await setAuthSessionCookie(platformUserId);
    } catch (error) {
      logAuthFailure("Session creation", error, { platformUserId });
      throw new AuthError(
        AUTH_ERROR_CODES.REGISTRATION_FAILED,
        AUTH_USER_MESSAGES.REGISTRATION_FAILED,
        500
      );
    }

    const user = await this.authService.getAuthenticatedUser();

    if (!user) {
      logAuthFailure(
        "Session creation",
        new Error("Authenticated user missing after registration")
      );
      throw new AuthError(
        AUTH_ERROR_CODES.REGISTRATION_FAILED,
        AUTH_USER_MESSAGES.REGISTRATION_FAILED,
        500
      );
    }

    await getAuthenticationAuditEmitter().emit({
      eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.USER_REGISTERED,
      outcome: "SUCCESS",
      timestamp: new Date(),
      platformUserId,
      clientContext,
      metadata: {
        phoneNumber: ownerPhoneE164,
        hasBusiness: false,
      },
    });

    return {
      user,
      platformUserId,
    };
  }

  private async assertPhoneAvailable(phoneNumberE164: string): Promise<void> {
    const db = getDb();

    const [existing] = await db
      .select({ id: platformUser.id })
      .from(platformUser)
      .where(eq(platformUser.phoneNumber, phoneNumberE164))
      .limit(1);

    if (existing) {
      throw new AuthError(
        AUTH_ERROR_CODES.PHONE_ALREADY_REGISTERED,
        AUTH_USER_MESSAGES.PHONE_ALREADY_REGISTERED,
        409
      );
    }
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const db = getDb();
    const normalized = email.trim().toLowerCase();

    const [existing] = await db
      .select({ id: platformUser.id })
      .from(platformUser)
      .where(sql`lower(${platformUser.email}) = ${normalized}`)
      .limit(1);

    if (existing) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        "This email address is already registered. Sign in or recover your account.",
        409
      );
    }
  }

  private async assertCountryActive(countryCode: string): Promise<void> {
    const db = getDb();

    const [countryRow] = await db
      .select({ code: country.code })
      .from(country)
      .where(and(eq(country.code, countryCode), eq(country.isActive, true)))
      .limit(1);

    if (!countryRow) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        "Select a valid country."
      );
    }
  }
}

export function createOnboardingService(): OnboardingService {
  return new OnboardingService();
}
