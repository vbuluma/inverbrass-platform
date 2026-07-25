/**
 * Purpose:
 * Manage security question catalogue access and hashed answer persistence.
 *
 * Design rationale:
 * Answers are normalized then hashed with bcrypt (12 rounds) before storage.
 * Verification compares hashes only; plain-text answers never leave the service
 * boundary into persistence.
 *
 * Business rationale:
 * IP-006A / AD-009 require security answers never be stored in plain text so
 * recovery remains usable without exposing secrets at rest.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 *
 * Implementation Package:
 * IP-006A – Platform Initialization & Security Hardening
 *
 * Responsibilities:
 * - Load active security questions for UI selectors
 * - Hash and store answers; verify submitted answers against stored hashes
 *
 * Non-Responsibilities:
 * - UI show/hide for answer fields (UI layer only)
 * - Password policy or session management
 *
 * Dependencies:
 * - bcryptjs, Drizzle ORM, security_question / user_security_answer schemas
 *
 * Business Rules Implemented:
 * - AD-009 §3.7 — at most one stored answer per platform user
 * - Answers stored as hashes only; verification uses hash comparison
 */

import { timingSafeEqual } from "node:crypto";

import bcrypt from "bcryptjs";
import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { PASSWORD_BCRYPT_ROUNDS } from "@/core/auth/constants";
import {
  AUTH_ERROR_CODES,
  AUTH_USER_MESSAGES,
  AuthError,
} from "@/core/auth/errors";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { securityQuestion } from "@/db/schema/security-question";
import { userSecurityAnswer } from "@/db/schema/user-security-answer";

type DbClient = PostgresJsDatabase<typeof schema>;

export type SecurityQuestionCatalogItem = {
  id: string;
  code: string;
  questionText: string;
};

export class SecurityQuestionService {
  /**
   * WHAT: Normalize answers before hash/compare.
   * WHY: Case/whitespace differences must not create false negatives.
   */
  normalizeAnswer(rawAnswer: string): string {
    return rawAnswer.trim().toLowerCase();
  }

  /**
   * WHAT: Hash a raw answer with bcrypt.
   * WHY: Persistence must never receive plain-text security answers.
   */
  async hashAnswer(rawAnswer: string): Promise<string> {
    const normalized = this.normalizeAnswer(rawAnswer);
    return bcrypt.hash(normalized, PASSWORD_BCRYPT_ROUNDS);
  }

  /**
   * WHAT: Compare a raw answer to a stored bcrypt hash.
   * WHY: Verification uses hashes only — never reverse the stored value.
   */
  async verifyAnswer(
    rawAnswer: string,
    storedHash: string
  ): Promise<boolean> {
    const normalized = this.normalizeAnswer(rawAnswer);
    return bcrypt.compare(normalized, storedHash);
  }

  /**
   * WHAT: Load active security questions for selectors.
   * WHY: Empty catalogues must fail soft with a log, not an unhandled throw.
   */
  async getActiveCatalog(): Promise<SecurityQuestionCatalogItem[]> {
    try {
      const db = getDb();

      const rows = await db
        .select({
          id: securityQuestion.id,
          code: securityQuestion.code,
          questionText: securityQuestion.questionText,
        })
        .from(securityQuestion)
        .where(eq(securityQuestion.isActive, true))
        .orderBy(asc(securityQuestion.displayOrder));

      if (rows.length === 0) {
        console.info(
          "[security-questions] No active security questions found. Seed security questions before registration."
        );
      }

      return rows;
    } catch (error) {
      console.error(
        "[security-questions] Failed to load active catalog; returning empty collection.",
        error
      );
      return [];
    }
  }

  async assertActiveQuestion(
    questionId: string,
    dbClient: DbClient = getDb()
  ): Promise<void> {
    // Use the caller-provided client so this works inside a transaction when
    // the process is limited to max:1 (Supabase session pooler).
    const [question] = await dbClient
      .select({ id: securityQuestion.id })
      .from(securityQuestion)
      .where(
        and(
          eq(securityQuestion.id, questionId),
          eq(securityQuestion.isActive, true)
        )
      )
      .limit(1);

    if (!question) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_SECURITY_QUESTION,
        AUTH_USER_MESSAGES.INVALID_SECURITY_QUESTION
      );
    }
  }

  /**
   * WHAT: Hash then insert the user's security answer.
   * WHY: Callers must not decide hashing — this is the only persistence path.
   */
  async hashAndStoreAnswer(
    platformUserId: string,
    questionId: string,
    rawAnswer: string,
    dbClient: DbClient = getDb()
  ): Promise<void> {
    await this.assertActiveQuestion(questionId, dbClient);

    const answerHash = await this.hashAnswer(rawAnswer);

    await dbClient.insert(userSecurityAnswer).values({
      platformUserId,
      securityQuestionId: questionId,
      answerHash,
    });
  }

  /**
   * Purpose:
   * Determine whether the user has already configured a security question answer.
   *
   * Business Context:
   * Owner registration captures security Q&A during signup; employee first login
   * captures it only when no answer exists yet.
   *
   * Inputs:
   * - platformUserId — platform user identifier
   *
   * Outputs:
   * - true when a hashed answer row exists; otherwise false
   *
   * Exceptions:
   * - None — returns false when no row exists
   *
   * Business Rules Implemented:
   * - AD-009 §3.7 — at most one stored answer per platform user
   */
  async hasStoredAnswer(platformUserId: string): Promise<boolean> {
    const db = getDb();

    const [row] = await db
      .select({ id: userSecurityAnswer.id })
      .from(userSecurityAnswer)
      .where(eq(userSecurityAnswer.platformUserId, platformUserId))
      .limit(1);

    return Boolean(row);
  }

  constantTimeCompare(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}

export function createSecurityQuestionService(): SecurityQuestionService {
  return new SecurityQuestionService();
}
