/**
 * Purpose:
 * Persist and read product variant rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { product } from "@/db/schema/product";
import { productVariant } from "@/db/schema/product-variant";
import { VARIANT_STATUS_CODES } from "@/modules/product/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type ProductVariantInsertValues = {
  businessId: string;
  productId: string;
  variantCode: string;
  variantName: string;
  status: string;
  displayOrder?: number;
  recordSource?: string;
  combinationFingerprint?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type ProductVariantUpdateValues = {
  variantName?: string;
  status?: string;
  displayOrder?: number;
  combinationFingerprint?: string | null;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export type ProductVariantSearchFilters = {
  query?: string;
  productId?: string;
  status?: string;
};

export class ProductVariantRepository {
  async insert(values: ProductVariantInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(productVariant)
      .values({
        businessId: values.businessId,
        productId: values.productId,
        variantCode: values.variantCode,
        variantName: values.variantName,
        status: values.status,
        displayOrder: values.displayOrder ?? 0,
        recordSource: values.recordSource ?? "PLATFORM_CREATED",
        combinationFingerprint: values.combinationFingerprint ?? null,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    variantId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(productVariant)
      .where(
        and(
          eq(productVariant.businessId, businessId),
          eq(productVariant.id, variantId),
          isNull(productVariant.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByCode(
    businessId: string,
    variantCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(productVariant)
      .where(
        and(
          eq(productVariant.businessId, businessId),
          eq(productVariant.variantCode, variantCode),
          isNull(productVariant.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByFingerprint(
    businessId: string,
    productId: string,
    fingerprint: string,
    excludeVariantId?: string,
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(productVariant.businessId, businessId),
      eq(productVariant.productId, productId),
      eq(productVariant.combinationFingerprint, fingerprint),
      isNull(productVariant.deletedAt),
    ];

    if (excludeVariantId) {
      conditions.push(sql`${productVariant.id} <> ${excludeVariantId}`);
    }

    const [row] = await dbClient
      .select()
      .from(productVariant)
      .where(and(...conditions))
      .limit(1);

    return row ?? null;
  }

  async listByBusinessId(
    businessId: string,
    filters: ProductVariantSearchFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(productVariant.businessId, businessId),
      isNull(productVariant.deletedAt),
    ];

    if (filters.productId) {
      conditions.push(eq(productVariant.productId, filters.productId));
    }

    if (filters.status) {
      conditions.push(eq(productVariant.status, filters.status));
    }

    if (filters.query) {
      const pattern = `%${filters.query.trim()}%`;
      conditions.push(
        or(
          ilike(productVariant.variantCode, pattern),
          ilike(productVariant.variantName, pattern)
        )!
      );
    }

    return dbClient
      .select({
        variant: productVariant,
        productCode: product.productCode,
        productName: product.productName,
      })
      .from(productVariant)
      .innerJoin(product, eq(productVariant.productId, product.id))
      .where(and(...conditions))
      .orderBy(desc(productVariant.updatedAt));
  }

  async listByProductId(
    businessId: string,
    productId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(productVariant)
      .where(
        and(
          eq(productVariant.businessId, businessId),
          eq(productVariant.productId, productId),
          isNull(productVariant.deletedAt)
        )
      )
      .orderBy(asc(productVariant.displayOrder), asc(productVariant.variantName));
  }

  async update(
    businessId: string,
    variantId: string,
    values: ProductVariantUpdateValues,
    expectedVersion: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(productVariant)
      .set({
        ...values,
        updatedAt: new Date(),
        version: sql`${productVariant.version} + 1`,
      })
      .where(
        and(
          eq(productVariant.businessId, businessId),
          eq(productVariant.id, variantId),
          eq(productVariant.version, expectedVersion),
          isNull(productVariant.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async archiveAllForProduct(
    businessId: string,
    productId: string,
    updatedBy: string | null,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .update(productVariant)
      .set({
        status: VARIANT_STATUS_CODES.ARCHIVED,
        updatedBy,
        updatedAt: new Date(),
        version: sql`${productVariant.version} + 1`,
      })
      .where(
        and(
          eq(productVariant.businessId, businessId),
          eq(productVariant.productId, productId),
          isNull(productVariant.deletedAt),
          sql`${productVariant.status} <> ${VARIANT_STATUS_CODES.ARCHIVED}`
        )
      )
      .returning();
  }

  async countByStatus(
    businessId: string,
    status: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(productVariant)
      .where(
        and(
          eq(productVariant.businessId, businessId),
          eq(productVariant.status, status),
          isNull(productVariant.deletedAt)
        )
      );

    return row?.count ?? 0;
  }

  async countDistinctProducts(
    businessId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(distinct ${productVariant.productId})::int` })
      .from(productVariant)
      .where(
        and(
          eq(productVariant.businessId, businessId),
          isNull(productVariant.deletedAt)
        )
      );

    return row?.count ?? 0;
  }

  async countByBusinessId(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(productVariant)
      .where(
        and(
          eq(productVariant.businessId, businessId),
          isNull(productVariant.deletedAt)
        )
      );

    return row?.count ?? 0;
  }
}

export function createProductVariantRepository() {
  return new ProductVariantRepository();
}
