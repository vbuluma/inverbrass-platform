/**
 * Idempotent seed runner for ENG-003b Consent Sources.
 */

import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { consentSource } from "@/db/schema/consent-source";
import { consentSourceSeedRows } from "@/db/seeds/consent-sources";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedConsentSources(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of consentSourceSeedRows) {
    const countryCondition = row.countryCode
      ? eq(consentSource.countryCode, row.countryCode)
      : isNull(consentSource.countryCode);

    const [existing] = await db
      .select({ id: consentSource.id })
      .from(consentSource)
      .where(and(eq(consentSource.code, row.code), countryCondition))
      .limit(1);

    if (!existing) {
      await db.insert(consentSource).values({
        code: row.code,
        name: row.name,
        countryCode: row.countryCode,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
      });
      counts.inserted += 1;
    } else {
      await db
        .update(consentSource)
        .set({
          name: row.name,
          description: row.description,
          displayOrder: row.displayOrder,
          isActive: row.isActive,
          updatedAt: new Date(),
        })
        .where(eq(consentSource.id, existing.id));
      counts.updated += 1;
    }
  }

  return counts;
}
