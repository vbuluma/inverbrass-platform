/**
 * Purpose:
 * Persist and read product catalogue publication rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-007 – Digital Catalogue Engine
 */

import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { catalogueChannel } from "@/db/schema/catalogue-channel";
import { product } from "@/db/schema/product";
import { productCataloguePublication } from "@/db/schema/product-catalogue-publication";

type DbClient = PostgresJsDatabase<typeof schema>;

export type PublicationInsertValues = {
  businessId: string;
  productId: string;
  channelId: string;
  published?: boolean;
  visibility?: string;
  publishFrom?: Date | null;
  publishTo?: Date | null;
  featured?: boolean;
  recommended?: boolean;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type PublicationUpdateValues = {
  published?: boolean;
  visibility?: string;
  publishFrom?: Date | null;
  publishTo?: Date | null;
  featured?: boolean;
  recommended?: boolean;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export type CatalogueSearchFilters = {
  query?: string;
  channelCode?: string;
  visibility?: string;
  productTypeCode?: string;
  publishedOnly?: boolean;
  featuredOnly?: boolean;
};

export class ProductCataloguePublicationRepository {
  async insert(values: PublicationInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(productCataloguePublication)
      .values({
        businessId: values.businessId,
        productId: values.productId,
        channelId: values.channelId,
        published: values.published ?? false,
        visibility: values.visibility ?? "PUBLIC",
        publishFrom: values.publishFrom ?? null,
        publishTo: values.publishTo ?? null,
        featured: values.featured ?? false,
        recommended: values.recommended ?? false,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async update(
    businessId: string,
    publicationId: string,
    values: PublicationUpdateValues,
    expectedVersion: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(productCataloguePublication)
      .set({
        ...(values.published !== undefined ? { published: values.published } : {}),
        ...(values.visibility !== undefined ? { visibility: values.visibility } : {}),
        ...(values.publishFrom !== undefined ? { publishFrom: values.publishFrom } : {}),
        ...(values.publishTo !== undefined ? { publishTo: values.publishTo } : {}),
        ...(values.featured !== undefined ? { featured: values.featured } : {}),
        ...(values.recommended !== undefined ? { recommended: values.recommended } : {}),
        ...(values.metadata !== undefined ? { metadata: values.metadata } : {}),
        updatedBy: values.updatedBy ?? null,
        updatedAt: new Date(),
        version: sql`${productCataloguePublication.version} + 1`,
      })
      .where(
        and(
          eq(productCataloguePublication.businessId, businessId),
          eq(productCataloguePublication.id, publicationId),
          eq(productCataloguePublication.version, expectedVersion),
          isNull(productCataloguePublication.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async findByProductAndChannel(
    businessId: string,
    productId: string,
    channelId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(productCataloguePublication)
      .where(
        and(
          eq(productCataloguePublication.businessId, businessId),
          eq(productCataloguePublication.productId, productId),
          eq(productCataloguePublication.channelId, channelId),
          isNull(productCataloguePublication.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByProductId(
    businessId: string,
    productId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select({
        publication: productCataloguePublication,
        channelCode: catalogueChannel.code,
        channelName: catalogueChannel.name,
      })
      .from(productCataloguePublication)
      .innerJoin(
        catalogueChannel,
        eq(catalogueChannel.id, productCataloguePublication.channelId)
      )
      .where(
        and(
          eq(productCataloguePublication.businessId, businessId),
          eq(productCataloguePublication.productId, productId),
          isNull(productCataloguePublication.deletedAt)
        )
      )
      .orderBy(asc(catalogueChannel.displayOrder));
  }

  async countPublishedProducts(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({
        count: sql<number>`count(distinct ${productCataloguePublication.productId})::int`,
      })
      .from(productCataloguePublication)
      .where(
        and(
          eq(productCataloguePublication.businessId, businessId),
          eq(productCataloguePublication.published, true),
          isNull(productCataloguePublication.deletedAt)
        )
      );

    return row?.count ?? 0;
  }

  async countFeatured(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(productCataloguePublication)
      .where(
        and(
          eq(productCataloguePublication.businessId, businessId),
          eq(productCataloguePublication.featured, true),
          eq(productCataloguePublication.published, true),
          isNull(productCataloguePublication.deletedAt)
        )
      );

    return row?.count ?? 0;
  }

  async countScheduled(businessId: string, dbClient: DbClient = getDb()) {
    const now = new Date();
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(productCataloguePublication)
      .where(
        and(
          eq(productCataloguePublication.businessId, businessId),
          eq(productCataloguePublication.published, true),
          sql`${productCataloguePublication.publishFrom} IS NOT NULL`,
          sql`${productCataloguePublication.publishFrom} > ${now}`,
          isNull(productCataloguePublication.deletedAt)
        )
      );

    return row?.count ?? 0;
  }

  async search(
    businessId: string,
    filters: CatalogueSearchFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(productCataloguePublication.businessId, businessId),
      isNull(productCataloguePublication.deletedAt),
    ];

    if (filters.publishedOnly) {
      conditions.push(eq(productCataloguePublication.published, true));
    }

    if (filters.featuredOnly) {
      conditions.push(eq(productCataloguePublication.featured, true));
    }

    if (filters.visibility) {
      conditions.push(eq(productCataloguePublication.visibility, filters.visibility));
    }

    if (filters.channelCode) {
      conditions.push(eq(catalogueChannel.code, filters.channelCode));
    }

    if (filters.productTypeCode) {
      conditions.push(eq(product.productTypeCode, filters.productTypeCode));
    }

    if (filters.query) {
      const term = `%${filters.query}%`;
      conditions.push(
        or(ilike(product.productCode, term), ilike(product.productName, term))!
      );
    }

    return dbClient
      .selectDistinct({
        product,
        publication: productCataloguePublication,
        channelCode: catalogueChannel.code,
        channelName: catalogueChannel.name,
      })
      .from(productCataloguePublication)
      .innerJoin(product, eq(product.id, productCataloguePublication.productId))
      .innerJoin(
        catalogueChannel,
        eq(catalogueChannel.id, productCataloguePublication.channelId)
      )
      .where(and(...conditions))
      .orderBy(desc(product.updatedAt));
  }

  async listPublishedByChannel(
    businessId: string,
    channelCode: string,
    featuredOnly = false,
    limit = 50,
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(productCataloguePublication.businessId, businessId),
      eq(productCataloguePublication.published, true),
      eq(catalogueChannel.code, channelCode),
      isNull(productCataloguePublication.deletedAt),
      isNull(product.deletedAt),
    ];

    if (featuredOnly) {
      conditions.push(eq(productCataloguePublication.featured, true));
    }

    return dbClient
      .select({
        product,
        publication: productCataloguePublication,
        channelCode: catalogueChannel.code,
      })
      .from(productCataloguePublication)
      .innerJoin(product, eq(product.id, productCataloguePublication.productId))
      .innerJoin(
        catalogueChannel,
        eq(catalogueChannel.id, productCataloguePublication.channelId)
      )
      .where(and(...conditions))
      .orderBy(desc(productCataloguePublication.featured), desc(product.updatedAt))
      .limit(limit);
  }
}

export function createProductCataloguePublicationRepository() {
  return new ProductCataloguePublicationRepository();
}
