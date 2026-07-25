/**
 * Purpose:
 * Persist and verify platform password credentials in PostgreSQL.
 *
 * Design rationale:
 * Stage 1 authentication is application-owned. Password hashes live on
 * user_security_profile.password_hash. Supabase Auth is not used.
 *
 * Why this exists:
 * Keeps credential persistence in a dedicated service (business rules + hashing)
 * while repositories/Drizzle handle storage access via this service boundary.
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  AUTH_ERROR_CODES,
  AUTH_USER_MESSAGES,
  AuthError,
} from "@/core/auth/errors";
import {
  hashPassword,
  verifyPassword,
} from "@/core/auth/utils/password-hasher";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { userSecurityProfile } from "@/db/schema/user-security-profile";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CredentialService {
  /**
   * WHAT: Store a bcrypt password hash for a Platform User.
   * WHY: Registration and password reset must persist credentials without plain text.
   */
  async setPasswordHash(
    platformUserId: string,
    plainPassword: string,
    dbClient: DbClient = getDb()
  ): Promise<void> {
    const passwordHash = await hashPassword(plainPassword);

    await dbClient
      .insert(userSecurityProfile)
      .values({
        platformUserId,
        passwordHash,
        failedLoginAttempts: 0,
      })
      .onConflictDoUpdate({
        target: userSecurityProfile.platformUserId,
        set: {
          passwordHash,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * WHAT: Verify a candidate password against the stored hash.
   * WHY: Login and first-login current-password checks are platform-owned.
   */
  async verifyUserPassword(
    platformUserId: string,
    plainPassword: string
  ): Promise<boolean> {
    const db = getDb();

    const [profile] = await db
      .select({ passwordHash: userSecurityProfile.passwordHash })
      .from(userSecurityProfile)
      .where(eq(userSecurityProfile.platformUserId, platformUserId))
      .limit(1);

    if (!profile?.passwordHash) {
      console.error(
        "[credential-service] Password verification failed — no password_hash.",
        { platformUserId, stage: "Authentication" }
      );
      return false;
    }

    return verifyPassword(plainPassword, profile.passwordHash);
  }

  /**
   * WHAT: Require a successful password verification or throw.
   * WHY: Callers need a consistent AuthError for invalid credentials.
   */
  async assertPasswordValid(
    platformUserId: string,
    plainPassword: string
  ): Promise<void> {
    const valid = await this.verifyUserPassword(platformUserId, plainPassword);

    if (!valid) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        AUTH_USER_MESSAGES.INVALID_CREDENTIALS,
        401
      );
    }
  }
}

export function createCredentialService(): CredentialService {
  return new CredentialService();
}
