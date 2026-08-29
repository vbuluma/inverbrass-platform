/**
 * Purpose:
 * Idempotent seed for inventory operation controls.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { inventoryOperationControl } from "@/db/schema/inventory-operation-control";
import { inventoryOperationControls } from "@/db/seeds/inventory-operation-controls";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedInventoryOperationControls(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of inventoryOperationControls) {
    const [existing] = await db
      .select({ id: inventoryOperationControl.id })
      .from(inventoryOperationControl)
      .where(eq(inventoryOperationControl.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(inventoryOperationControl).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(inventoryOperationControl)
      .set({
        name: row.name,
        description: row.description,
        movementType: row.movementType,
        overReceiptPolicy: row.overReceiptPolicy,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(inventoryOperationControl.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
