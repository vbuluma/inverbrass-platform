/**
 * Purpose:
 * Idempotent seed of platform pricing method reference catalogue.
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { pricingMethod } from "@/db/schema/pricing-method";
import { defaultPricingMethods } from "@/db/seeds/pricing-methods";

type DbClient = PostgresJsDatabase<typeof schema>;

export type PricingMethodsSeedResult = {
  inserted: number;
  skipped: number;
};

export async function seedPricingMethods(
  db: DbClient = getDb()
): Promise<PricingMethodsSeedResult> {
  let inserted = 0;
  let skipped = 0;

  for (const method of defaultPricingMethods) {
    const [existing] = await db
      .select({ id: pricingMethod.id })
      .from(pricingMethod)
      .where(eq(pricingMethod.code, method.code))
      .limit(1);

    if (existing) {
      skipped += 1;
      continue;
    }

    await db.insert(pricingMethod).values({
      code: method.code,
      name: method.name,
      description: method.description,
      displayOrder: method.displayOrder,
      isActive: true,
    });

    inserted += 1;
  }

  return { inserted, skipped };
}
