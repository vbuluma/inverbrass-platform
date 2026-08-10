/**
 * Purpose:
 * Idempotent seed runner for CRM Type reference catalogue.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { crmType } from "@/db/schema/crm-type";
import { crmTypes } from "@/db/seeds/crm-types";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedCrmTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of crmTypes) {
    const [existing] = await db
      .select({ id: crmType.id })
      .from(crmType)
      .where(eq(crmType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(crmType).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(crmType)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(crmType.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
