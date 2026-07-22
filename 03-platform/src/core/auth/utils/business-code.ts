import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { business } from "@/db/schema/business";

type DbClient = PostgresJsDatabase<typeof schema>;

const MAX_GENERATION_ATTEMPTS = 10;
const CODE_SUFFIX_BYTES = 3;
const NAME_PREFIX_MAX_LENGTH = 8;
const BUSINESS_CODE_MAX_LENGTH = 20;

/**
 * Builds a single business-code candidate from the business name.
 * Format: {NAME_PREFIX}-{RANDOM_HEX} (max 20 chars).
 * Name prefix: uppercase alphanumeric slug from business name (max 8 chars), or "BIZ" if empty.
 * Suffix: 3 random bytes as 6 uppercase hex characters (cryptographically random).
 */
export function buildBusinessCodeCandidate(businessName: string): string {
  const slug = businessName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, NAME_PREFIX_MAX_LENGTH);

  const suffix = randomBytes(CODE_SUFFIX_BYTES).toString("hex").toUpperCase();
  const prefix = slug.length > 0 ? slug : "BIZ";

  return `${prefix}-${suffix}`.slice(0, BUSINESS_CODE_MAX_LENGTH);
}

/**
 * Generates a unique business code by checking the database for collisions.
 * Retries up to MAX_GENERATION_ATTEMPTS with a new random suffix each attempt.
 * Uniqueness is enforced by the business.code unique constraint; this function
 * proactively avoids constraint violations before insert.
 */
export async function generateUniqueBusinessCode(
  businessName: string,
  dbClient: DbClient = getDb()
): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const candidate = buildBusinessCodeCandidate(businessName);

    const [existing] = await dbClient
      .select({ id: business.id })
      .from(business)
      .where(eq(business.code, candidate))
      .limit(1);

    if (!existing) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to generate a unique business code after ${MAX_GENERATION_ATTEMPTS} attempts.`
  );
}
