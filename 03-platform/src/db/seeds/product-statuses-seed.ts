/**
 * Purpose:
 * Idempotent seed runner for Product Status reference catalogue.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { productStatus } from "@/db/schema/product-status";
import { productStatuses } from "@/db/seeds/product-statuses";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedProductStatuses(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of productStatuses) {
    const [existing] = await db
      .select({ id: productStatus.id })
      .from(productStatus)
      .where(eq(productStatus.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(productStatus).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(productStatus)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(productStatus.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
