import { timingSafeEqual } from "node:crypto";

import bcrypt from "bcryptjs";
import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  AUTH_ERROR_CODES,
  AUTH_USER_MESSAGES,
  AuthError,
} from "@/core/auth/errors";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { securityQuestion } from "@/db/schema/security-question";
import { userSecurityAnswer } from "@/db/schema/user-security-answer";

const BCRYPT_ROUNDS = 12;

type DbClient = PostgresJsDatabase<typeof schema>;

export type SecurityQuestionCatalogItem = {
  id: string;
  code: string;
  questionText: string;
};

export class SecurityQuestionService {
  normalizeAnswer(rawAnswer: string): string {
    return rawAnswer.trim().toLowerCase();
  }

  async hashAnswer(rawAnswer: string): Promise<string> {
    const normalized = this.normalizeAnswer(rawAnswer);
    return bcrypt.hash(normalized, BCRYPT_ROUNDS);
  }

  async verifyAnswer(
    rawAnswer: string,
    storedHash: string
  ): Promise<boolean> {
    const normalized = this.normalizeAnswer(rawAnswer);
    return bcrypt.compare(normalized, storedHash);
  }

  async getActiveCatalog(): Promise<SecurityQuestionCatalogItem[]> {
    const db = getDb();

    return db
      .select({
        id: securityQuestion.id,
        code: securityQuestion.code,
        questionText: securityQuestion.questionText,
      })
      .from(securityQuestion)
      .where(eq(securityQuestion.isActive, true))
      .orderBy(asc(securityQuestion.displayOrder));
  }

  async assertActiveQuestion(questionId: string): Promise<void> {
    const db = getDb();

    const [question] = await db
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

  async hashAndStoreAnswer(
    platformUserId: string,
    questionId: string,
    rawAnswer: string,
    dbClient: DbClient = getDb()
  ): Promise<void> {
    await this.assertActiveQuestion(questionId);

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
