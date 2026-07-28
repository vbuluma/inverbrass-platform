/**
 * Purpose:
 * Idempotent seed runner for Organizational Unit Type catalogue.
 *
 * Engine:
 * ENG-003c – Organization Structure Engine
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { organizationalUnitType } from "@/db/schema/organizational-unit-type";
import { organizationalUnitTypes } from "@/db/seeds/organizational-unit-types";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedOrganizationalUnitTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of organizationalUnitTypes) {
    const [existing] = await db
      .select({ id: organizationalUnitType.id })
      .from(organizationalUnitType)
      .where(eq(organizationalUnitType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(organizationalUnitType).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(organizationalUnitType)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(organizationalUnitType.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
