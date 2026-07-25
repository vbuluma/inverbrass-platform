/**
 * Purpose:
 * Orchestrate forgot-password recovery using security question verification.
 *
 * Design rationale (Stage 1):
 * Recovery resets the platform password hash in PostgreSQL. No email/SMS/OTP.
 * Supabase Auth is not used for password updates.
 *
 * Architecture Dependency:
 * AD-009 §3.7 (recovery channel) + BP-001 Foundation Stabilization Stage 1
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
import { createCredentialService } from "@/core/auth/services/credential-service";
import type { CredentialService } from "@/core/auth/services/credential-service";
import { createSecurityQuestionService } from "@/core/auth/services/security-question-service";
import type { SecurityQuestionService } from "@/core/auth/services/security-question-service";
import type {
  ClientContext,
  RecoveryCompletionPayload,
  RecoveryInitiationPayload,
  RecoveryInitiationResult,
} from "@/core/auth/types";
import { logAuthFailure } from "@/core/auth/utils/auth-stage-log";
import { normalizeMobileNumber } from "@/core/auth/utils/phone-normalizer";
import {
  recoveryCompletionSchema,
  recoveryInitiationSchema,
} from "@/core/auth/validators/recovery-validators";
import { AUTHENTICATION_AUDIT_EVENT_TYPES } from "@/core/audit/types";
import { getAuthenticationAuditEmitter } from "@/core/audit/authentication-audit-emitter";
import { getDb } from "@/db/client";
import { platformUser } from "@/db/schema/platform-user";
import { securityQuestion } from "@/db/schema/security-question";
import { userSecurityAnswer } from "@/db/schema/user-security-answer";
import { userSecurityProfile } from "@/db/schema/user-security-profile";

type RecoveryUserRecord = {
  platformUserId: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  answerHash: string;
  securityQuestionText: string;
};

export class PasswordRecoveryService {
  constructor(
    private readonly credentialService: CredentialService = createCredentialService(),
    private readonly securityQuestionService: SecurityQuestionService = createSecurityQuestionService()
  ) {}

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
        metadata: { reason: "RECOVERY_USER_NOT_FOUND" },
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
        metadata: { reason: "RECOVERY_ANSWER_INVALID" },
      });

      throw new AuthError(
        AUTH_ERROR_CODES.RECOVERY_ANSWER_INVALID,
        AUTH_USER_MESSAGES.RECOVERY_ANSWER_INVALID,
        401
      );
    }

    try {
      await this.credentialService.setPasswordHash(
        user.platformUserId,
        parsed.data.newPassword
      );

      const db = getDb();

      await db
        .update(userSecurityProfile)
        .set({
          mustChangePassword: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(userSecurityProfile.platformUserId, user.platformUserId));
    } catch (error) {
      logAuthFailure("Database persistence", error, {
        step: "password-recovery-update",
        platformUserId: user.platformUserId,
      });
      throw error instanceof AuthError
        ? error
        : new AuthError(
            AUTH_ERROR_CODES.PROVIDER_ERROR,
            AUTH_USER_MESSAGES.PROVIDER_ERROR,
            500
          );
    }

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
