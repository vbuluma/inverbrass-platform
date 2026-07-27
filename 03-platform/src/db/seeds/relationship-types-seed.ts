/**
 * Purpose:
 * Idempotent seed runner for Relationship Type reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-005 – Party Relationships
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { relationshipType } from "@/db/schema/relationship-type";
import { relationshipTypes } from "@/db/seeds/relationship-types";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedRelationshipTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of relationshipTypes) {
    const [existing] = await db
      .select({ id: relationshipType.id })
      .from(relationshipType)
      .where(eq(relationshipType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(relationshipType).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(relationshipType)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(relationshipType.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
