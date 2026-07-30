/**
 * Purpose:
 * Idempotent seed runner for Product Type reference catalogue.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { productType } from "@/db/schema/product-type";
import { productTypes } from "@/db/seeds/product-types";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedProductTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of productTypes) {
    const [existing] = await db
      .select({ id: productType.id })
      .from(productType)
      .where(eq(productType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(productType).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(productType)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(productType.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
