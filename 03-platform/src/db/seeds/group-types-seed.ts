/**
 * Purpose:
 * Idempotent seed runner for Group Type reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { groupType } from "@/db/schema/group-type";
import { groupTypes } from "@/db/seeds/group-types";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedGroupTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of groupTypes) {
    const [existing] = await db
      .select({ id: groupType.id })
      .from(groupType)
      .where(eq(groupType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(groupType).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(groupType)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(groupType.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
