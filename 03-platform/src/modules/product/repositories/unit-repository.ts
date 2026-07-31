/**
 * Purpose:
 * Persist and read unit of measure rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { unitCategory } from "@/db/schema/unit-category";
import { unitOfMeasure } from "@/db/schema/unit-of-measure";
import { UNIT_STATUS_CODES } from "@/modules/product/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type UnitInsertValues = {
  businessId: string;
  categoryId: string;
  code: string;
  name: string;
  symbol: string;
  conversionFactor: string;
  decimalPrecision?: number;
  roundingRule?: string;
  isBaseUnit?: boolean;
  status: string;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type UnitUpdateValues = {
  name?: string;
  symbol?: string;
  conversionFactor?: string;
  decimalPrecision?: number;
  roundingRule?: string;
  isBaseUnit?: boolean;
  status?: string;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export type UnitSearchFilters = {
  query?: string;
  status?: string;
  categoryId?: string;
};

export class UnitRepository {
  async insert(values: UnitInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(unitOfMeasure)
      .values({
        businessId: values.businessId,
        categoryId: values.categoryId,
        code: values.code,
        name: values.name,
        symbol: values.symbol,
        conversionFactor: values.conversionFactor,
        decimalPrecision: values.decimalPrecision ?? 2,
        roundingRule: values.roundingRule ?? "HALF_UP",
        isBaseUnit: values.isBaseUnit ?? false,
        status: values.status,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    unitId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(unitOfMeasure)
      .where(
        and(
          eq(unitOfMeasure.businessId, businessId),
          eq(unitOfMeasure.id, unitId),
          isNull(unitOfMeasure.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByCode(
    businessId: string,
    code: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(unitOfMeasure)
      .where(
        and(
          eq(unitOfMeasure.businessId, businessId),
          eq(unitOfMeasure.code, code),
          isNull(unitOfMeasure.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findBySymbolInCategory(
    businessId: string,
    categoryId: string,
    symbol: string,
    excludeUnitId?: string,
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(unitOfMeasure.businessId, businessId),
      eq(unitOfMeasure.categoryId, categoryId),
      eq(unitOfMeasure.symbol, symbol),
      isNull(unitOfMeasure.deletedAt),
    ];

    if (excludeUnitId) {
      conditions.push(sql`${unitOfMeasure.id} <> ${excludeUnitId}`);
    }

    const [row] = await dbClient
      .select()
      .from(unitOfMeasure)
      .where(and(...conditions))
      .limit(1);

    return row ?? null;
  }

  async listByBusinessId(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        unit: unitOfMeasure,
        categoryCode: unitCategory.code,
        categoryName: unitCategory.name,
      })
      .from(unitOfMeasure)
      .innerJoin(unitCategory, eq(unitOfMeasure.categoryId, unitCategory.id))
      .where(
        and(
          eq(unitOfMeasure.businessId, businessId),
          isNull(unitOfMeasure.deletedAt),
          isNull(unitCategory.deletedAt)
        )
      )
      .orderBy(asc(unitCategory.name), asc(unitOfMeasure.name));
  }

  async listByCategoryId(
    businessId: string,
    categoryId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(unitOfMeasure)
      .where(
        and(
          eq(unitOfMeasure.businessId, businessId),
          eq(unitOfMeasure.categoryId, categoryId),
          isNull(unitOfMeasure.deletedAt)
        )
      )
      .orderBy(desc(unitOfMeasure.isBaseUnit), asc(unitOfMeasure.name));
  }

  async countBaseUnitsInCategory(
    businessId: string,
    categoryId: string,
    excludeUnitId?: string,
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(unitOfMeasure.businessId, businessId),
      eq(unitOfMeasure.categoryId, categoryId),
      eq(unitOfMeasure.isBaseUnit, true),
      isNull(unitOfMeasure.deletedAt),
    ];

    if (excludeUnitId) {
      conditions.push(sql`${unitOfMeasure.id} <> ${excludeUnitId}`);
    }

    const [row] = await dbClient
      .select({ value: sql<number>`count(*)::int` })
      .from(unitOfMeasure)
      .where(and(...conditions));

    return Number(row?.value ?? 0);
  }

  async search(
    businessId: string,
    filters: UnitSearchFilters,
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(unitOfMeasure.businessId, businessId),
      isNull(unitOfMeasure.deletedAt),
      isNull(unitCategory.deletedAt),
    ];

    if (filters.status) {
      conditions.push(eq(unitOfMeasure.status, filters.status));
    }
    if (filters.categoryId) {
      conditions.push(eq(unitOfMeasure.categoryId, filters.categoryId));
    }
    if (filters.query) {
      const pattern = `%${filters.query}%`;
      conditions.push(
        or(
          ilike(unitOfMeasure.code, pattern),
          ilike(unitOfMeasure.name, pattern),
          ilike(unitOfMeasure.symbol, pattern),
          ilike(unitCategory.name, pattern)
        )!
      );
    }

    return dbClient
      .select({
        unit: unitOfMeasure,
        categoryCode: unitCategory.code,
        categoryName: unitCategory.name,
      })
      .from(unitOfMeasure)
      .innerJoin(unitCategory, eq(unitOfMeasure.categoryId, unitCategory.id))
      .where(and(...conditions))
      .orderBy(desc(unitOfMeasure.updatedAt));
  }

  async updateById(
    businessId: string,
    unitId: string,
    values: UnitUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(unitOfMeasure)
      .set({
        ...values,
        updatedAt: new Date(),
        version: sql`${unitOfMeasure.version} + 1`,
      })
      .where(
        and(
          eq(unitOfMeasure.businessId, businessId),
          eq(unitOfMeasure.id, unitId),
          isNull(unitOfMeasure.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async countGroupedByStatus(businessId: string, dbClient: DbClient = getDb()) {
    const rows = await dbClient
      .select({
        status: unitOfMeasure.status,
        value: sql<number>`count(*)::int`,
      })
      .from(unitOfMeasure)
      .where(
        and(
          eq(unitOfMeasure.businessId, businessId),
          isNull(unitOfMeasure.deletedAt)
        )
      )
      .groupBy(unitOfMeasure.status);

    return rows;
  }

  async countActiveUnits(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ value: sql<number>`count(*)::int` })
      .from(unitOfMeasure)
      .where(
        and(
          eq(unitOfMeasure.businessId, businessId),
          eq(unitOfMeasure.status, UNIT_STATUS_CODES.ACTIVE),
          isNull(unitOfMeasure.deletedAt)
        )
      );

    return Number(row?.value ?? 0);
  }
}

export function createUnitRepository() {
  return new UnitRepository();
}
