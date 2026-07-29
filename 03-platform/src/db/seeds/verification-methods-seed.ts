/**
 * Purpose:
 * Idempotent seed runner for verification method catalogue.
 *
 * Module:
 * Core Platform – Document & Compliance
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { verificationMethod } from "@/db/schema/verification-method";
import { verificationMethods } from "@/db/seeds/verification-methods";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedVerificationMethods(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of verificationMethods) {
    const [existing] = await db
      .select({ id: verificationMethod.id })
      .from(verificationMethod)
      .where(eq(verificationMethod.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(verificationMethod).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(verificationMethod)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(verificationMethod.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
