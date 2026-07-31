/**
 * Purpose:
 * Idempotent bootstrap of default unit categories and units per business.
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@/db/schema";
import { unitCategory } from "@/db/schema/unit-category";
import { unitOfMeasure } from "@/db/schema/unit-of-measure";
import { defaultUnitCategories } from "@/db/seeds/unit-defaults";
import {
  UNIT_CATEGORY_STATUS_CODES,
  UNIT_STATUS_CODES,
} from "@/modules/product/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type UnitDefaultsSeedResult = {
  seeded: boolean;
  categoriesInserted: number;
  unitsInserted: number;
};

export async function seedDefaultUnitsForBusiness(
  businessId: string,
  db: DbClient,
  createdBy?: string | null
): Promise<UnitDefaultsSeedResult> {
  const [existing] = await db
    .select({ id: unitCategory.id })
    .from(unitCategory)
    .where(eq(unitCategory.businessId, businessId))
    .limit(1);

  if (existing) {
    return { seeded: false, categoriesInserted: 0, unitsInserted: 0 };
  }

  let categoriesInserted = 0;
  let unitsInserted = 0;

  for (const categoryTemplate of defaultUnitCategories) {
    const [categoryRow] = await db
      .insert(unitCategory)
      .values({
        businessId,
        code: categoryTemplate.code,
        name: categoryTemplate.name,
        description: categoryTemplate.description,
        status: UNIT_CATEGORY_STATUS_CODES.ACTIVE,
        createdBy: createdBy ?? null,
        updatedBy: createdBy ?? null,
      })
      .returning();

    categoriesInserted += 1;

    const unitIdByCode = new Map<string, string>();

    for (const unitTemplate of categoryTemplate.units) {
      const [unitRow] = await db
        .insert(unitOfMeasure)
        .values({
          businessId,
          categoryId: categoryRow.id,
          code: unitTemplate.code,
          name: unitTemplate.name,
          symbol: unitTemplate.symbol,
          conversionFactor: unitTemplate.conversionFactor,
          decimalPrecision: unitTemplate.decimalPrecision,
          roundingRule: "HALF_UP",
          isBaseUnit: unitTemplate.isBaseUnit,
          status: UNIT_STATUS_CODES.ACTIVE,
          createdBy: createdBy ?? null,
          updatedBy: createdBy ?? null,
        })
        .returning();

      unitIdByCode.set(unitTemplate.code, unitRow.id);
      unitsInserted += 1;
    }

    const baseUnitId = unitIdByCode.get(categoryTemplate.baseUnitCode);
    if (baseUnitId) {
      await db
        .update(unitCategory)
        .set({
          baseUnitId,
          updatedAt: new Date(),
          updatedBy: createdBy ?? null,
        })
        .where(eq(unitCategory.id, categoryRow.id));
    }
  }

  return { seeded: true, categoriesInserted, unitsInserted };
}
