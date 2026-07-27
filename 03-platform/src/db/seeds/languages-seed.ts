/**
 * Purpose:
 * Idempotent seed runner for Language reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { language } from "@/db/schema/language";
import { languages } from "@/db/seeds/languages";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedLanguages(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of languages) {
    const [existing] = await db
      .select({ id: language.id })
      .from(language)
      .where(eq(language.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(language).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(language)
      .set({
        name: row.name,
        nativeName: row.nativeName,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(language.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
