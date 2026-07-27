/**
 * Purpose:
 * Idempotent seed runner for Organization Type reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { organizationType } from "@/db/schema/organization-type";
import { organizationTypes } from "@/db/seeds/organization-types";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedOrganizationTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of organizationTypes) {
    const [existing] = await db
      .select({ id: organizationType.id })
      .from(organizationType)
      .where(eq(organizationType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(organizationType).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(organizationType)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(organizationType.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
