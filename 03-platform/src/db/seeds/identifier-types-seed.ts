/**
 * Purpose:
 * Idempotent seed runner for Identifier Type reference catalogue.
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { identifierType } from "@/db/schema/identifier-type";
import { identifierTypes } from "@/db/seeds/identifier-types";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedIdentifierTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of identifierTypes) {
    const [existing] = await db
      .select({ id: identifierType.id })
      .from(identifierType)
      .where(eq(identifierType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(identifierType).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(identifierType)
      .set({
        name: row.name,
        description: row.description,
        validationPattern: row.validationPattern,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(identifierType.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
