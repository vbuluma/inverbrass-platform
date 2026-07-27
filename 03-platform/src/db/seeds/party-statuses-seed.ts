/**
 * Purpose:
 * Idempotent seed runner for Party Status reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { partyStatus } from "@/db/schema/party-status";
import { partyStatuses } from "@/db/seeds/party-statuses";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedPartyStatuses(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of partyStatuses) {
    const [existing] = await db
      .select({ id: partyStatus.id })
      .from(partyStatus)
      .where(eq(partyStatus.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(partyStatus).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(partyStatus)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(partyStatus.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
