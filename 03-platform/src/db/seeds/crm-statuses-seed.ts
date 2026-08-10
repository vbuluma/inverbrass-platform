/**
 * Purpose:
 * Idempotent seed runner for CRM Status reference catalogue.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { crmStatus } from "@/db/schema/crm-status";
import { crmStatuses } from "@/db/seeds/crm-statuses";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedCrmStatuses(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of crmStatuses) {
    const [existing] = await db
      .select({ id: crmStatus.id })
      .from(crmStatus)
      .where(eq(crmStatus.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(crmStatus).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(crmStatus)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(crmStatus.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
