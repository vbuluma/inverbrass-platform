/**
 * Purpose:
 * Idempotent seed runner for Party Type reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { partyType } from "@/db/schema/party-type";
import { partyTypes } from "@/db/seeds/party-types";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedPartyTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of partyTypes) {
    const [existing] = await db
      .select({ id: partyType.id })
      .from(partyType)
      .where(eq(partyType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(partyType).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(partyType)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(partyType.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
