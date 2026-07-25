/**
 * Purpose:
 * Idempotent seed runner for the country reference catalogue.
 *
 * Why it exists:
 * Registration, login, forgot-password, and setup require active countries.
 * Upsert-by-code keeps re-seeding safe for local and CI environments.
 *
 * Implementation Package:
 * IP-006A – Platform Initialization & Security Hardening
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { country } from "@/db/schema/country";
import { countries } from "@/db/seeds/countries";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedCountries(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of countries) {
    // ----------------------------------------------------
    // Upsert by ISO alpha-2 code — natural key for countries.
    // ----------------------------------------------------
    const [existing] = await db
      .select({ id: country.id })
      .from(country)
      .where(eq(country.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(country).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(country)
      .set({
        iso3Code: row.iso3Code,
        name: row.name,
        phoneCode: row.phoneCode,
        currencyCode: row.currencyCode,
        timezoneCode: row.timezoneCode,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(country.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
