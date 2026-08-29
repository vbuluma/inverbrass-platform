/**
 * Purpose:
 * Idempotent seed runner for inventory location type catalogue.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { inventoryLocationType } from "@/db/schema/inventory-location-type";
import { inventoryLocationTypes } from "@/db/seeds/inventory-location-types";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedInventoryLocationTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of inventoryLocationTypes) {
    const [existing] = await db
      .select({ id: inventoryLocationType.id })
      .from(inventoryLocationType)
      .where(eq(inventoryLocationType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(inventoryLocationType).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(inventoryLocationType)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(inventoryLocationType.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
