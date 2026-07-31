/**
 * Purpose:
 * Idempotent seed runner for Catalogue Structure type reference catalogue.
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { productClassificationType } from "@/db/schema/product-classification-type";
import { productClassificationTypes } from "@/db/seeds/product-classification-types";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedProductClassificationTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of productClassificationTypes) {
    const [existing] = await db
      .select({ id: productClassificationType.id })
      .from(productClassificationType)
      .where(eq(productClassificationType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(productClassificationType).values({
        ...row,
        isActive: true,
      });
      counts.inserted += 1;
      continue;
    }

    await db
      .update(productClassificationType)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(productClassificationType.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
