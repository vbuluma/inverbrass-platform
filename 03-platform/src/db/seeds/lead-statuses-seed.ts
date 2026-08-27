/**
 * Purpose:
 * Idempotent seed runner for Lead Status reference catalogue.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { leadStatus } from "@/db/schema/lead-status";
import { leadStatuses } from "@/db/seeds/lead-statuses";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedLeadStatuses(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of leadStatuses) {
    const [existing] = await db
      .select({ id: leadStatus.id })
      .from(leadStatus)
      .where(eq(leadStatus.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(leadStatus).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(leadStatus)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(leadStatus.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
