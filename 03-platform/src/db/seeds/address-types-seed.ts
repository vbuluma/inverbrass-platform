/**
 * Purpose:
 * Idempotent seed runner for Address Type reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-004 – Address Management
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { addressType } from "@/db/schema/address-type";
import { addressTypes } from "@/db/seeds/address-types";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedAddressTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of addressTypes) {
    const [existing] = await db
      .select({ id: addressType.id })
      .from(addressType)
      .where(eq(addressType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(addressType).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(addressType)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(addressType.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
