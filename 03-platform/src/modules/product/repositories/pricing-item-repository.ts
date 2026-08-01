/**
 * Purpose:
 * Persist and read offering pricing item rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
 */

import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { pricingCatalogue } from "@/db/schema/pricing-catalogue";
import { pricingItem } from "@/db/schema/pricing-item";
import { product } from "@/db/schema/product";
import { PRICING_ITEM_STATUS_CODES } from "@/modules/product/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type PricingItemInsertValues = {
  businessId: string;
  offeringId: string;
  pricingCatalogueId: string;
  currencyCode: string;
  unitPrice: string;
  minimumPrice?: string | null;
  maximumPrice?: string | null;
  pricingMethod: string;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  status: string;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type PricingItemUpdateValues = {
  unitPrice?: string;
  minimumPrice?: string | null;
  maximumPrice?: string | null;
  pricingMethod?: string;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  effectiveFrom?: Date;
  effectiveTo?: Date | null;
  status?: string;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export type PricingItemSearchFilters = {
  query?: string;
  offeringId?: string;
  pricingCatalogueId?: string;
  currencyCode?: string;
  customerSegment?: string;
  salesChannel?: string;
  region?: string;
  status?: string;
};

export type PricingItemRowWithRelations = {
  item: typeof pricingItem.$inferSelect;
  offeringCode: string;
  offeringName: string;
  catalogueCode: string;
  catalogueName: string;
};

export class PricingItemRepository {
  async insert(values: PricingItemInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(pricingItem)
      .values({
        businessId: values.businessId,
        offeringId: values.offeringId,
        pricingCatalogueId: values.pricingCatalogueId,
        currencyCode: values.currencyCode,
        unitPrice: values.unitPrice,
        minimumPrice: values.minimumPrice ?? null,
        maximumPrice: values.maximumPrice ?? null,
        pricingMethod: values.pricingMethod,
        customerSegment: values.customerSegment ?? null,
        salesChannel: values.salesChannel ?? null,
        region: values.region ?? null,
        effectiveFrom: values.effectiveFrom,
        effectiveTo: values.effectiveTo ?? null,
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
    itemId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(pricingItem)
      .where(
        and(
          eq(pricingItem.businessId, businessId),
          eq(pricingItem.id, itemId),
          isNull(pricingItem.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByIdWithRelations(
    businessId: string,
    itemId: string,
    dbClient: DbClient = getDb()
  ): Promise<PricingItemRowWithRelations | null> {
    const [row] = await dbClient
      .select({
        item: pricingItem,
        offeringCode: product.productCode,
        offeringName: product.productName,
        catalogueCode: pricingCatalogue.code,
        catalogueName: pricingCatalogue.name,
      })
      .from(pricingItem)
      .innerJoin(product, eq(pricingItem.offeringId, product.id))
      .innerJoin(
        pricingCatalogue,
        eq(pricingItem.pricingCatalogueId, pricingCatalogue.id)
      )
      .where(
        and(
          eq(pricingItem.businessId, businessId),
          eq(pricingItem.id, itemId),
          isNull(pricingItem.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByOfferingId(
    businessId: string,
    offeringId: string,
    dbClient: DbClient = getDb()
  ): Promise<PricingItemRowWithRelations[]> {
    return dbClient
      .select({
        item: pricingItem,
        offeringCode: product.productCode,
        offeringName: product.productName,
        catalogueCode: pricingCatalogue.code,
        catalogueName: pricingCatalogue.name,
      })
      .from(pricingItem)
      .innerJoin(product, eq(pricingItem.offeringId, product.id))
      .innerJoin(
        pricingCatalogue,
        eq(pricingItem.pricingCatalogueId, pricingCatalogue.id)
      )
      .where(
        and(
          eq(pricingItem.businessId, businessId),
          eq(pricingItem.offeringId, offeringId),
          isNull(pricingItem.deletedAt)
        )
      )
      .orderBy(desc(pricingItem.effectiveFrom));
  }

  async listActiveByOffering(
    businessId: string,
    offeringId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(pricingItem)
      .where(
        and(
          eq(pricingItem.businessId, businessId),
          eq(pricingItem.offeringId, offeringId),
          eq(pricingItem.status, PRICING_ITEM_STATUS_CODES.ACTIVE),
          isNull(pricingItem.deletedAt)
        )
      );
  }

  async search(
    businessId: string,
    filters: PricingItemSearchFilters,
    dbClient: DbClient = getDb()
  ): Promise<PricingItemRowWithRelations[]> {
    const conditions = [
      eq(pricingItem.businessId, businessId),
      isNull(pricingItem.deletedAt),
    ];

    if (filters.offeringId) {
      conditions.push(eq(pricingItem.offeringId, filters.offeringId));
    }
    if (filters.pricingCatalogueId) {
      conditions.push(
        eq(pricingItem.pricingCatalogueId, filters.pricingCatalogueId)
      );
    }
    if (filters.currencyCode) {
      conditions.push(eq(pricingItem.currencyCode, filters.currencyCode));
    }
    if (filters.customerSegment) {
      conditions.push(eq(pricingItem.customerSegment, filters.customerSegment));
    }
    if (filters.salesChannel) {
      conditions.push(eq(pricingItem.salesChannel, filters.salesChannel));
    }
    if (filters.region) {
      conditions.push(eq(pricingItem.region, filters.region));
    }
    if (filters.status) {
      conditions.push(eq(pricingItem.status, filters.status));
    }

    if (filters.query) {
      const pattern = `%${filters.query.trim()}%`;
      conditions.push(
        or(
          ilike(product.productCode, pattern),
          ilike(product.productName, pattern),
          ilike(pricingCatalogue.code, pattern),
          ilike(pricingCatalogue.name, pattern),
          ilike(pricingItem.customerSegment, pattern),
          ilike(pricingItem.salesChannel, pattern),
          ilike(pricingItem.region, pattern)
        )!
      );
    }

    return dbClient
      .select({
        item: pricingItem,
        offeringCode: product.productCode,
        offeringName: product.productName,
        catalogueCode: pricingCatalogue.code,
        catalogueName: pricingCatalogue.name,
      })
      .from(pricingItem)
      .innerJoin(product, eq(pricingItem.offeringId, product.id))
      .innerJoin(
        pricingCatalogue,
        eq(pricingItem.pricingCatalogueId, pricingCatalogue.id)
      )
      .where(and(...conditions))
      .orderBy(desc(pricingItem.effectiveFrom));
  }

  async updateById(
    businessId: string,
    itemId: string,
    values: PricingItemUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(pricingItem)
      .set({
        ...values,
        updatedAt: new Date(),
        version: sql`${pricingItem.version} + 1`,
      })
      .where(
        and(
          eq(pricingItem.businessId, businessId),
          eq(pricingItem.id, itemId),
          isNull(pricingItem.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async listActiveCandidates(
    businessId: string,
    offeringId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(pricingItem)
      .where(
        and(
          eq(pricingItem.businessId, businessId),
          eq(pricingItem.offeringId, offeringId),
          eq(pricingItem.status, PRICING_ITEM_STATUS_CODES.ACTIVE),
          isNull(pricingItem.deletedAt)
        )
      );
  }

  async countByStatusForOffering(
    businessId: string,
    offeringId: string,
    dbClient: DbClient = getDb()
  ) {
    const rows = await dbClient
      .select({
        status: pricingItem.status,
        count: sql<number>`count(*)::int`,
      })
      .from(pricingItem)
      .where(
        and(
          eq(pricingItem.businessId, businessId),
          eq(pricingItem.offeringId, offeringId),
          isNull(pricingItem.deletedAt)
        )
      )
      .groupBy(pricingItem.status);

    return rows;
  }

  async countGroupedByStatus(businessId: string, dbClient: DbClient = getDb()) {
    const rows = await dbClient
      .select({
        status: pricingItem.status,
        count: sql<number>`count(*)::int`,
      })
      .from(pricingItem)
      .where(
        and(
          eq(pricingItem.businessId, businessId),
          isNull(pricingItem.deletedAt)
        )
      )
      .groupBy(pricingItem.status);

    return rows;
  }

  async listRecentlyUpdated(
    businessId: string,
    limit = 8,
    dbClient: DbClient = getDb()
  ): Promise<PricingItemRowWithRelations[]> {
    return dbClient
      .select({
        item: pricingItem,
        offeringCode: product.productCode,
        offeringName: product.productName,
        catalogueCode: pricingCatalogue.code,
        catalogueName: pricingCatalogue.name,
      })
      .from(pricingItem)
      .innerJoin(product, eq(pricingItem.offeringId, product.id))
      .innerJoin(
        pricingCatalogue,
        eq(pricingItem.pricingCatalogueId, pricingCatalogue.id)
      )
      .where(
        and(
          eq(pricingItem.businessId, businessId),
          isNull(pricingItem.deletedAt)
        )
      )
      .orderBy(desc(pricingItem.updatedAt))
      .limit(limit);
  }
}

export function createPricingItemRepository() {
  return new PricingItemRepository();
}
