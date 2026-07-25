/**
 * Purpose:
 * Hash and verify platform passwords with bcrypt.
 *
 * Design rationale:
 * Stage 1 stores password hashes in PostgreSQL only. Plain-text passwords never
 * persist. bcrypt (12 rounds) matches the approved security-answer approach until
 * an Argon2id migration is planned.
 *
 * Why this exists:
 * BP-001 foundation stabilization — platform-owned authentication credentials.
 */

import bcrypt from "bcryptjs";

import { PASSWORD_BCRYPT_ROUNDS } from "@/core/auth/constants";

/**
 * WHAT: Produce a bcrypt password hash.
 * WHY: Persistence must receive hashes only — never plain-text passwords.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, PASSWORD_BCRYPT_ROUNDS);
}

/**
 * WHAT: Compare a candidate password to a stored bcrypt hash.
 * WHY: Login and password-change flows verify without exposing the hash.
 */
export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  if (!passwordHash) {
    return false;
  }

  return bcrypt.compare(plainPassword, passwordHash);
}
