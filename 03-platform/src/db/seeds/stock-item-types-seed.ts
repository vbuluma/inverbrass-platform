/**
 * Purpose:
 * Idempotent seed runner for stock-item type catalogue.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { stockItemType } from "@/db/schema/stock-item-type";
import { stockItemTypes } from "@/db/seeds/stock-item-types";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedStockItemTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of stockItemTypes) {
    const [existing] = await db
      .select({ id: stockItemType.id })
      .from(stockItemType)
      .where(eq(stockItemType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(stockItemType).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(stockItemType)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(stockItemType.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
