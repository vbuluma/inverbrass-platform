/**
 * Purpose:
 * Orchestrate forgot-password recovery using security question verification.
 *
 * Business Context:
 * BP-001 Phase 1 recovery uses mobile number and configured security Q&A only, without
 * email, SMS, or OTP channels per ADR-013.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.7)
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Initiate recovery by resolving the user's configured security question
 * - Verify security answers and reset passwords through AuthService
 * - Emit password reset audit events and enforce lockout policy
 *
 * Non-Responsibilities:
 * - UI rendering
 * - Security answer hashing (SecurityQuestionService)
 * - Session establishment after recovery
 *
 * Dependencies:
 * - AuthService, SecurityQuestionService, IdentityProviderAdapter, Drizzle ORM
 *
 * Business Rules Implemented:
 * - AD-009 §3.7 — mobile + security Q&A recovery
 * - ADR-013 — no email/SMS recovery in Phase 1
 *
 * Extension Points:
 * - Additional recovery channels belong to future Progressive Authentication phases
 */

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
import { createSecurityQuestionService } from "@/core/auth/services/security-question-service";
import type { SecurityQuestionService } from "@/core/auth/services/security-question-service";
import type {
  ClientContext,
  RecoveryCompletionPayload,
  RecoveryInitiationPayload,
  RecoveryInitiationResult,
} from "@/core/auth/types";
import {
  normalizeMobileNumber,
} from "@/core/auth/utils/phone-normalizer";
import {
  recoveryCompletionSchema,
  recoveryInitiationSchema,
} from "@/core/auth/validators/recovery-validators";
import {
  AUTHENTICATION_AUDIT_EVENT_TYPES,
} from "@/core/audit/types";
import { getAuthenticationAuditEmitter } from "@/core/audit/authentication-audit-emitter";
import { getDb } from "@/db/client";
import { platformUser } from "@/db/schema/platform-user";
import { securityQuestion } from "@/db/schema/security-question";
import { userSecurityAnswer } from "@/db/schema/user-security-answer";
import { userSecurityProfile } from "@/db/schema/user-security-profile";

type RecoveryUserRecord = {
  platformUserId: string;
  authUserId: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  answerHash: string;
  securityQuestionText: string;
};

export class PasswordRecoveryService {
  constructor(
    private readonly identityProvider: IdentityProviderAdapter = createIdentityProviderAdapter(),
    private readonly securityQuestionService: SecurityQuestionService = createSecurityQuestionService()
  ) {}

  /**
   * Purpose:
   * Resolve the configured security question for a mobile number.
   *
   * Business Context:
   * Recovery step one confirms the account exists and exposes only the question text.
   *
   * Inputs:
   * - payload — mobile number and country code
   * - clientContext — optional request metadata for audit enrichment
   *
   * Outputs:
   * - RecoveryInitiationResult containing the configured question text
   *
   * Exceptions:
   * - AuthError when account is unavailable or recovery is not configured
   */
  async initiateRecovery(
    payload: RecoveryInitiationPayload,
    clientContext?: ClientContext
  ): Promise<RecoveryInitiationResult> {
    const parsed = recoveryInitiationSchema.safeParse(payload);

    if (!parsed.success) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        parsed.error.issues[0]?.message ?? AUTH_USER_MESSAGES.INVALID_INPUT
      );
    }

    const user = await this.loadRecoveryUser(
      parsed.data.mobileNumber,
      parsed.data.countryCode
    );

    if (!user) {
      await getAuthenticationAuditEmitter().emit({
        eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.PASSWORD_RESET,
        outcome: "FAILURE",
        timestamp: new Date(),
        clientContext,
        metadata: {
          reason: "RECOVERY_USER_NOT_FOUND",
        },
      });

      throw new AuthError(
        AUTH_ERROR_CODES.RECOVERY_USER_NOT_FOUND,
        AUTH_USER_MESSAGES.RECOVERY_USER_NOT_FOUND
      );
    }

    this.assertAccountIsAccessible(user);

    return {
      securityQuestionText: user.securityQuestionText,
      mobileNumber: parsed.data.mobileNumber,
      countryCode: parsed.data.countryCode,
    };
  }

  /**
   * Purpose:
   * Complete password recovery after security answer verification.
   *
   * Business Context:
   * Successful recovery resets the Supabase Auth password and clears forced-change flags.
   *
   * Inputs:
   * - payload — mobile, answer, and new password fields
   * - clientContext — optional request metadata for audit enrichment
   *
   * Outputs:
   * - void on success; user signs in separately afterward
   *
   * Exceptions:
   * - AuthError for invalid answer, lockout, or provider failures
   *
   * Business Rules Implemented:
   * - AD-009 §3.7.2 — constant-time answer verification and lockout on failures
   */
  async completeRecovery(
    payload: RecoveryCompletionPayload,
    clientContext?: ClientContext
  ): Promise<void> {
    const parsed = recoveryCompletionSchema.safeParse(payload);

    if (!parsed.success) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        parsed.error.issues[0]?.message ?? AUTH_USER_MESSAGES.INVALID_INPUT
      );
    }

    const user = await this.loadRecoveryUser(
      parsed.data.mobileNumber,
      parsed.data.countryCode
    );

    if (!user) {
      throw new AuthError(
        AUTH_ERROR_CODES.RECOVERY_USER_NOT_FOUND,
        AUTH_USER_MESSAGES.RECOVERY_USER_NOT_FOUND
      );
    }

    this.assertAccountIsAccessible(user);

    const answerValid = await this.securityQuestionService.verifyAnswer(
      parsed.data.securityAnswer,
      user.answerHash
    );

    if (!answerValid) {
      await this.recordFailedRecovery(user.platformUserId, clientContext);

      await getAuthenticationAuditEmitter().emit({
        eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.PASSWORD_RESET,
        outcome: "FAILURE",
        timestamp: new Date(),
        platformUserId: user.platformUserId,
        clientContext,
        metadata: {
          reason: "RECOVERY_ANSWER_INVALID",
        },
      });

      throw new AuthError(
        AUTH_ERROR_CODES.RECOVERY_ANSWER_INVALID,
        AUTH_USER_MESSAGES.RECOVERY_ANSWER_INVALID,
        401
      );
    }

    await this.identityProvider.updatePasswordByAuthUserId(
      user.authUserId,
      parsed.data.newPassword
    );

    const db = getDb();

    await db
      .insert(userSecurityProfile)
      .values({
        platformUserId: user.platformUserId,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
      })
      .onConflictDoUpdate({
        target: userSecurityProfile.platformUserId,
        set: {
          mustChangePassword: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        },
      });

    await getAuthenticationAuditEmitter().emit({
      eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.PASSWORD_RESET,
      outcome: "SUCCESS",
      timestamp: new Date(),
      platformUserId: user.platformUserId,
      clientContext,
    });
  }

  private async loadRecoveryUser(
    mobileNumber: string,
    countryCode: string
  ): Promise<RecoveryUserRecord | null> {
    let phoneNumberE164: string;

    try {
      phoneNumberE164 = normalizeMobileNumber(mobileNumber, countryCode);
    } catch {
      return null;
    }

    const db = getDb();

    const [row] = await db
      .select({
        platformUserId: platformUser.id,
        authUserId: platformUser.authUserId,
        isActive: platformUser.isActive,
        failedLoginAttempts: userSecurityProfile.failedLoginAttempts,
        lockedUntil: userSecurityProfile.lockedUntil,
        answerHash: userSecurityAnswer.answerHash,
        securityQuestionText: securityQuestion.questionText,
      })
      .from(platformUser)
      .leftJoin(
        userSecurityProfile,
        eq(userSecurityProfile.platformUserId, platformUser.id)
      )
      .innerJoin(
        userSecurityAnswer,
        eq(userSecurityAnswer.platformUserId, platformUser.id)
      )
      .innerJoin(
        securityQuestion,
        eq(securityQuestion.id, userSecurityAnswer.securityQuestionId)
      )
      .where(eq(platformUser.phoneNumber, phoneNumberE164))
      .limit(1);

    if (!row?.answerHash || !row.securityQuestionText) {
      return null;
    }

    return {
      platformUserId: row.platformUserId,
      authUserId: row.authUserId,
      isActive: row.isActive,
      failedLoginAttempts: row.failedLoginAttempts ?? 0,
      lockedUntil: row.lockedUntil ?? null,
      answerHash: row.answerHash,
      securityQuestionText: row.securityQuestionText,
    };
  }

  private assertAccountIsAccessible(user: RecoveryUserRecord): void {
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

  private async recordFailedRecovery(
    platformUserId: string,
    clientContext?: ClientContext
  ): Promise<void> {
    const db = getDb();

    const [profile] = await db
      .select({
        failedLoginAttempts: userSecurityProfile.failedLoginAttempts,
      })
      .from(userSecurityProfile)
      .where(eq(userSecurityProfile.platformUserId, platformUserId))
      .limit(1);

    const nextAttempts = (profile?.failedLoginAttempts ?? 0) + 1;
    const shouldLock = nextAttempts >= LOCKOUT_THRESHOLD;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
      : null;

    await db
      .insert(userSecurityProfile)
      .values({
        platformUserId,
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
        platformUserId,
        clientContext,
        metadata: {
          failedLoginAttempts: nextAttempts,
          source: "PASSWORD_RECOVERY",
        },
      });
    }
  }
}

export function createPasswordRecoveryService(): PasswordRecoveryService {
  return new PasswordRecoveryService();
}
