/**
 * Purpose:
 * Idempotent seed runner for ENG-003b required identifier configuration.
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 */

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { requiredIdentifier } from "@/db/schema/required-identifier";
import { requiredIdentifiers } from "@/db/seeds/required-identifiers";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedRequiredIdentifiers(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of requiredIdentifiers) {
    const [existing] = await db
      .select({ id: requiredIdentifier.id })
      .from(requiredIdentifier)
      .where(
        and(
          eq(requiredIdentifier.ruleSetCode, row.ruleSetCode),
          eq(requiredIdentifier.identifierTypeCode, row.identifierTypeCode)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(requiredIdentifier).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(requiredIdentifier)
      .set({
        requirementLevel: row.requirementLevel,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(requiredIdentifier.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
