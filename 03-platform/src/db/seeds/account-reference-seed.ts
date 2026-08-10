/**
 * Purpose:
 * Idempotent seed runner for account types, statuses, and CRM contact roles.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { accountStatus } from "@/db/schema/account-status";
import { accountType } from "@/db/schema/account-type";
import { crmContactRole } from "@/db/schema/crm-contact-role";
import {
  accountStatuses,
  accountTypes,
  crmContactRoles,
} from "@/db/seeds/account-reference";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

async function upsertCatalogue<T extends { code: string; name: string; description?: string; displayOrder: number; isActive: boolean }>(
  db: PostgresJsDatabase,
  table: typeof accountType | typeof accountStatus | typeof crmContactRole,
  rows: readonly T[],
  counts: SeedCounts
) {
  for (const row of rows) {
    const [existing] = await db
      .select({ id: table.id })
      .from(table)
      .where(eq(table.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(table).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(table)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(table.id, existing.id));
    counts.updated += 1;
  }
}

export async function seedAccountReference(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };
  await upsertCatalogue(db, accountType, accountTypes, counts);
  await upsertCatalogue(db, accountStatus, accountStatuses, counts);
  await upsertCatalogue(db, crmContactRole, crmContactRoles, counts);
  return counts;
}
