/**
 * Purpose:
 * Persist and read unit category rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { unitCategory } from "@/db/schema/unit-category";

type DbClient = PostgresJsDatabase<typeof schema>;

export type UnitCategoryInsertValues = {
  businessId: string;
  code: string;
  name: string;
  description?: string | null;
  baseUnitId?: string | null;
  status: string;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type UnitCategoryUpdateValues = {
  name?: string;
  description?: string | null;
  baseUnitId?: string | null;
  status?: string;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export class UnitCategoryRepository {
  async insert(values: UnitCategoryInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(unitCategory)
      .values({
        businessId: values.businessId,
        code: values.code,
        name: values.name,
        description: values.description ?? null,
        baseUnitId: values.baseUnitId ?? null,
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
    categoryId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(unitCategory)
      .where(
        and(
          eq(unitCategory.businessId, businessId),
          eq(unitCategory.id, categoryId),
          isNull(unitCategory.deletedAt)
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
      .from(unitCategory)
      .where(
        and(
          eq(unitCategory.businessId, businessId),
          eq(unitCategory.code, code),
          isNull(unitCategory.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByBusinessId(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(unitCategory)
      .where(
        and(
          eq(unitCategory.businessId, businessId),
          isNull(unitCategory.deletedAt)
        )
      )
      .orderBy(asc(unitCategory.name));
  }

  async countByBusinessId(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ value: sql<number>`count(*)::int` })
      .from(unitCategory)
      .where(
        and(
          eq(unitCategory.businessId, businessId),
          isNull(unitCategory.deletedAt)
        )
      );

    return Number(row?.value ?? 0);
  }

  async updateById(
    businessId: string,
    categoryId: string,
    values: UnitCategoryUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(unitCategory)
      .set({
        ...values,
        updatedAt: new Date(),
        version: sql`${unitCategory.version} + 1`,
      })
      .where(
        and(
          eq(unitCategory.businessId, businessId),
          eq(unitCategory.id, categoryId),
          isNull(unitCategory.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }
}

export function createUnitCategoryRepository() {
  return new UnitCategoryRepository();
}
