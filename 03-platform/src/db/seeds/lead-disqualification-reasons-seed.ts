/**
 * Purpose:
 * Idempotent seed runner for Lead Disqualification Reason reference catalogue.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { leadDisqualificationReason } from "@/db/schema/lead-disqualification-reason";
import { leadDisqualificationReasons } from "@/db/seeds/lead-disqualification-reasons";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedLeadDisqualificationReasons(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of leadDisqualificationReasons) {
    const [existing] = await db
      .select({ id: leadDisqualificationReason.id })
      .from(leadDisqualificationReason)
      .where(eq(leadDisqualificationReason.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(leadDisqualificationReason).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(leadDisqualificationReason)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(leadDisqualificationReason.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
