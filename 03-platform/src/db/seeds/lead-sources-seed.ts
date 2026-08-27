/**
 * Purpose:
 * Idempotent seed runner for Lead Source reference catalogue.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { leadSource } from "@/db/schema/lead-source";
import { leadSources } from "@/db/seeds/lead-sources";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedLeadSources(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of leadSources) {
    const [existing] = await db
      .select({ id: leadSource.id })
      .from(leadSource)
      .where(eq(leadSource.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(leadSource).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(leadSource)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(leadSource.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
