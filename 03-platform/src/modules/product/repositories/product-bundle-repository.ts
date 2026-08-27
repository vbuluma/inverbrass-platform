/**
 * Purpose:
 * Persist and read product bundle rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-006 – Bundles & Packages Engine
 */

import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { productBundle } from "@/db/schema/product-bundle";
import { productBundleItem } from "@/db/schema/product-bundle-item";

type DbClient = PostgresJsDatabase<typeof schema>;

export type ProductBundleInsertValues = {
  businessId: string;
  bundleCode: string;
  bundleName: string;
  bundleType: string;
  statusCode: string;
  ownerPartyId?: string | null;
  description?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  pricingStrategy?: string;
  availabilityType?: string;
  recordSource?: string;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type ProductBundleUpdateValues = {
  bundleName?: string;
  bundleType?: string;
  statusCode?: string;
  ownerPartyId?: string | null;
  description?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  pricingStrategy?: string;
  availabilityType?: string;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export type ProductBundleSearchFilters = {
  query?: string;
  statusCode?: string;
  ownerPartyId?: string;
  productId?: string;
};

export class ProductBundleRepository {
  async insert(values: ProductBundleInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(productBundle)
      .values({
        businessId: values.businessId,
        bundleCode: values.bundleCode,
        bundleName: values.bundleName,
        bundleType: values.bundleType,
        statusCode: values.statusCode,
        ownerPartyId: values.ownerPartyId ?? null,
        description: values.description ?? null,
        effectiveFrom: values.effectiveFrom ?? null,
        effectiveTo: values.effectiveTo ?? null,
        pricingStrategy: values.pricingStrategy ?? "SUM_OF_ITEMS",
        availabilityType: values.availabilityType ?? "ACTIVE",
        recordSource: values.recordSource ?? "PLATFORM_CREATED",
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    bundleId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(productBundle)
      .where(
        and(
          eq(productBundle.businessId, businessId),
          eq(productBundle.id, bundleId),
          isNull(productBundle.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByCode(
    businessId: string,
    bundleCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(productBundle)
      .where(
        and(
          eq(productBundle.businessId, businessId),
          eq(productBundle.bundleCode, bundleCode),
          isNull(productBundle.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async update(
    businessId: string,
    bundleId: string,
    values: ProductBundleUpdateValues,
    expectedVersion: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(productBundle)
      .set({
        ...(values.bundleName !== undefined ? { bundleName: values.bundleName } : {}),
        ...(values.bundleType !== undefined ? { bundleType: values.bundleType } : {}),
        ...(values.statusCode !== undefined ? { statusCode: values.statusCode } : {}),
        ...(values.ownerPartyId !== undefined
          ? { ownerPartyId: values.ownerPartyId }
          : {}),
        ...(values.description !== undefined ? { description: values.description } : {}),
        ...(values.effectiveFrom !== undefined
          ? { effectiveFrom: values.effectiveFrom }
          : {}),
        ...(values.effectiveTo !== undefined ? { effectiveTo: values.effectiveTo } : {}),
        ...(values.pricingStrategy !== undefined
          ? { pricingStrategy: values.pricingStrategy }
          : {}),
        ...(values.availabilityType !== undefined
          ? { availabilityType: values.availabilityType }
          : {}),
        ...(values.metadata !== undefined ? { metadata: values.metadata } : {}),
        updatedBy: values.updatedBy ?? null,
        updatedAt: new Date(),
        version: sql`${productBundle.version} + 1`,
      })
      .where(
        and(
          eq(productBundle.businessId, businessId),
          eq(productBundle.id, bundleId),
          eq(productBundle.version, expectedVersion),
          isNull(productBundle.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async listByBusinessId(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(productBundle)
      .where(
        and(eq(productBundle.businessId, businessId), isNull(productBundle.deletedAt))
      )
      .orderBy(desc(productBundle.updatedAt), desc(productBundle.bundleName));
  }

  async countByStatus(
    businessId: string,
    statusCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(productBundle)
      .where(
        and(
          eq(productBundle.businessId, businessId),
          eq(productBundle.statusCode, statusCode),
          isNull(productBundle.deletedAt)
        )
      );

    return row?.count ?? 0;
  }

  async search(
    businessId: string,
    filters: ProductBundleSearchFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(productBundle.businessId, businessId),
      isNull(productBundle.deletedAt),
    ];

    if (filters.statusCode) {
      conditions.push(eq(productBundle.statusCode, filters.statusCode));
    }

    if (filters.ownerPartyId) {
      conditions.push(eq(productBundle.ownerPartyId, filters.ownerPartyId));
    }

    if (filters.query) {
      const pattern = `%${filters.query}%`;
      conditions.push(
        or(
          ilike(productBundle.bundleCode, pattern),
          ilike(productBundle.bundleName, pattern)
        )!
      );
    }

    if (filters.productId) {
      return dbClient
        .selectDistinct({ bundle: productBundle })
        .from(productBundle)
        .innerJoin(productBundleItem, eq(productBundleItem.bundleId, productBundle.id))
        .where(
          and(
            ...conditions,
            eq(productBundleItem.productId, filters.productId),
            isNull(productBundleItem.deletedAt)
          )
        )
        .orderBy(desc(productBundle.updatedAt))
        .then((rows) => rows.map((row) => row.bundle));
    }

    return dbClient
      .select()
      .from(productBundle)
      .where(and(...conditions))
      .orderBy(desc(productBundle.updatedAt), desc(productBundle.bundleName));
  }

  async listByProductId(
    businessId: string,
    productId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .selectDistinct({ bundle: productBundle })
      .from(productBundle)
      .innerJoin(productBundleItem, eq(productBundleItem.bundleId, productBundle.id))
      .where(
        and(
          eq(productBundle.businessId, businessId),
          eq(productBundleItem.productId, productId),
          isNull(productBundle.deletedAt),
          isNull(productBundleItem.deletedAt)
        )
      )
      .orderBy(desc(productBundle.updatedAt));
  }
}

export function createProductBundleRepository() {
  return new ProductBundleRepository();
}
