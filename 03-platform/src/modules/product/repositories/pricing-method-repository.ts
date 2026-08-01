/**
 * Purpose:
 * Read platform pricing method reference catalogue.
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
 */

import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { pricingMethod } from "@/db/schema/pricing-method";

type DbClient = PostgresJsDatabase<typeof schema>;

export class PricingMethodRepository {
  async listActive(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: pricingMethod.code,
        name: pricingMethod.name,
        description: pricingMethod.description,
      })
      .from(pricingMethod)
      .where(eq(pricingMethod.isActive, true))
      .orderBy(asc(pricingMethod.displayOrder), asc(pricingMethod.name));
  }

  async isActiveCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ code: pricingMethod.code })
      .from(pricingMethod)
      .where(eq(pricingMethod.code, code))
      .limit(1);

    return Boolean(row);
  }

  async getName(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ name: pricingMethod.name })
      .from(pricingMethod)
      .where(eq(pricingMethod.code, code))
      .limit(1);

    return row?.name ?? code;
  }
}

export function createPricingMethodRepository() {
  return new PricingMethodRepository();
}
