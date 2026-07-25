/**
 * Purpose:
 * Generate cryptographically secure temporary passwords for provisioned users.
 *
 * Design rationale:
 * Temporary passwords exist only in memory at creation time. Persistence stores
 * bcrypt hashes only. Callers must never log or echo the plain value in errors.
 *
 * Implementation Package:
 * BP-001 – Business Onboarding Enhancement & Stabilization
 */

import { randomBytes } from "node:crypto";

const TEMP_PASSWORD_BYTES = 12;

/**
 * WHAT: Generate a one-time temporary password.
 * WHY: Provisioned employees must sign in once then change password (first-login).
 */
export function generateTemporaryPassword(): string {
  return randomBytes(TEMP_PASSWORD_BYTES).toString("base64url");
}
