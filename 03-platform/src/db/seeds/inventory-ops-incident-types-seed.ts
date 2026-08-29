/**
 * Purpose:
 * Idempotent seed for operational inventory incident types.
 *
 * Implementation Package:
 * BP-008 / IP-09 – Inventory Operations, Exceptions & Controls
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { inventoryOpsIncidentType } from "@/db/schema/inventory-ops-incident-type";
import { inventoryOpsIncidentTypes } from "@/db/seeds/inventory-ops-incident-types";

type SeedCounts = { inserted: number; updated: number; skipped: number };

export async function seedInventoryOpsIncidentTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };
  for (const row of inventoryOpsIncidentTypes) {
    const [existing] = await db
      .select({ id: inventoryOpsIncidentType.id })
      .from(inventoryOpsIncidentType)
      .where(eq(inventoryOpsIncidentType.code, row.code))
      .limit(1);
    if (!existing) {
      await db.insert(inventoryOpsIncidentType).values(row);
      counts.inserted += 1;
      continue;
    }
    await db
      .update(inventoryOpsIncidentType)
      .set({
        name: row.name,
        description: row.description,
        defaultSeverity: row.defaultSeverity,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(inventoryOpsIncidentType.id, existing.id));
    counts.updated += 1;
  }
  return counts;
}
