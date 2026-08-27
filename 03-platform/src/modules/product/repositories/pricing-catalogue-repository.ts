/**
 * Purpose:
 * Persist and read pricing catalogue rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
 */

import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { pricingCatalogue } from "@/db/schema/pricing-catalogue";
import { PRICING_CATALOGUE_STATUS_CODES } from "@/modules/product/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type PricingCatalogueInsertValues = {
  businessId: string;
  code: string;
  name: string;
  description?: string | null;
  currencyCode: string;
  status: string;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type PricingCatalogueUpdateValues = {
  name?: string;
  description?: string | null;
  currencyCode?: string;
  status?: string;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export type PricingCatalogueSearchFilters = {
  query?: string;
  status?: string;
  currencyCode?: string;
};

export class PricingCatalogueRepository {
  async insert(values: PricingCatalogueInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(pricingCatalogue)
      .values({
        businessId: values.businessId,
        code: values.code,
        name: values.name,
        description: values.description ?? null,
        currencyCode: values.currencyCode,
        status: values.status,
        effectiveFrom: values.effectiveFrom ?? null,
        effectiveTo: values.effectiveTo ?? null,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    catalogueId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(pricingCatalogue)
      .where(
        and(
          eq(pricingCatalogue.businessId, businessId),
          eq(pricingCatalogue.id, catalogueId),
          isNull(pricingCatalogue.deletedAt)
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
      .from(pricingCatalogue)
      .where(
        and(
          eq(pricingCatalogue.businessId, businessId),
          eq(pricingCatalogue.code, code),
          isNull(pricingCatalogue.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByBusinessId(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(pricingCatalogue)
      .where(
        and(
          eq(pricingCatalogue.businessId, businessId),
          isNull(pricingCatalogue.deletedAt)
        )
      )
      .orderBy(asc(pricingCatalogue.name));
  }

  async search(
    businessId: string,
    filters: PricingCatalogueSearchFilters,
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(pricingCatalogue.businessId, businessId),
      isNull(pricingCatalogue.deletedAt),
    ];

    if (filters.status) {
      conditions.push(eq(pricingCatalogue.status, filters.status));
    }

    if (filters.currencyCode) {
      conditions.push(eq(pricingCatalogue.currencyCode, filters.currencyCode));
    }

    if (filters.query) {
      const pattern = `%${filters.query.trim()}%`;
      conditions.push(
        or(
          ilike(pricingCatalogue.code, pattern),
          ilike(pricingCatalogue.name, pattern),
          ilike(pricingCatalogue.description, pattern)
        )!
      );
    }

    return dbClient
      .select()
      .from(pricingCatalogue)
      .where(and(...conditions))
      .orderBy(asc(pricingCatalogue.name));
  }

  async updateById(
    businessId: string,
    catalogueId: string,
    values: PricingCatalogueUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(pricingCatalogue)
      .set({
        ...values,
        updatedAt: new Date(),
        version: sql`${pricingCatalogue.version} + 1`,
      })
      .where(
        and(
          eq(pricingCatalogue.businessId, businessId),
          eq(pricingCatalogue.id, catalogueId),
          isNull(pricingCatalogue.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async countByStatus(businessId: string, dbClient: DbClient = getDb()) {
    const rows = await dbClient
      .select({
        status: pricingCatalogue.status,
        count: sql<number>`count(*)::int`,
      })
      .from(pricingCatalogue)
      .where(
        and(
          eq(pricingCatalogue.businessId, businessId),
          isNull(pricingCatalogue.deletedAt)
        )
      )
      .groupBy(pricingCatalogue.status);

    return rows;
  }

  async countActive(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(pricingCatalogue)
      .where(
        and(
          eq(pricingCatalogue.businessId, businessId),
          eq(pricingCatalogue.status, PRICING_CATALOGUE_STATUS_CODES.ACTIVE),
          isNull(pricingCatalogue.deletedAt)
        )
      );

    return row?.count ?? 0;
  }

  async listRecentlyUpdated(
    businessId: string,
    limit = 8,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(pricingCatalogue)
      .where(
        and(
          eq(pricingCatalogue.businessId, businessId),
          isNull(pricingCatalogue.deletedAt)
        )
      )
      .orderBy(desc(pricingCatalogue.updatedAt))
      .limit(limit);
  }
}

export function createPricingCatalogueRepository() {
  return new PricingCatalogueRepository();
}
