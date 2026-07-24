/**
 * Purpose:
 * Seed the currency reference catalogue used by IP-006 setup.
 *
 * Implementation Package:
 * IP-006 – Business Setup Wizard, Configuration & Activation
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { currency } from "@/db/schema/currency";
import { currencies } from "@/db/seeds/currencies";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedCurrencies(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of currencies) {
    const [existing] = await db
      .select({ id: currency.id })
      .from(currency)
      .where(eq(currency.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(currency).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(currency)
      .set({
        name: row.name,
        symbol: row.symbol,
        decimalPlaces: row.decimalPlaces,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(currency.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
