/**
 * Purpose:
 * Idempotent seed runner for Party Role Type reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-002 – Party Roles
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { roleType } from "@/db/schema/role-type";
import { roleTypes } from "@/db/seeds/role-types";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedRoleTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of roleTypes) {
    const [existing] = await db
      .select({ id: roleType.id })
      .from(roleType)
      .where(eq(roleType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(roleType).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(roleType)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(roleType.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
