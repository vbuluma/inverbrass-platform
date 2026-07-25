/**
 * Purpose:
 * Idempotent seed runner for the industry reference catalogue.
 *
 * Why it exists:
 * Business types depend on industry rows. Seeding industries first keeps
 * business-type upserts configuration-driven and referentially valid.
 *
 * Implementation Package:
 * IP-006A – Platform Initialization & Security Hardening
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { industry } from "@/db/schema/industry";
import { industries } from "@/db/seeds/industries";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedIndustries(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of industries) {
    const [existing] = await db
      .select({ id: industry.id })
      .from(industry)
      .where(eq(industry.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(industry).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(industry)
      .set({
        name: row.name,
        description: row.description,
        iconCode: row.iconCode,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(industry.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
