/**
 * Purpose:
 * Persist and read master Product rows.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { product } from "@/db/schema/product";
import type {
  ProductRecordSourceCode,
  ProductStatusCode,
} from "@/modules/product/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type ProductInsertValues = {
  businessId: string;
  productCode: string;
  productName: string;
  shortName?: string | null;
  description?: string | null;
  productTypeCode: string;
  statusCode: ProductStatusCode | string;
  ownerPartyId?: string | null;
  defaultCurrency?: string | null;
  launchDate?: string | null;
  retirementDate?: string | null;
  isSellable?: boolean;
  isPurchasable?: boolean;
  isBookable?: boolean;
  isRentable?: boolean;
  isSubscription?: boolean;
  isDigital?: boolean;
  isActive?: boolean;
  recordSource?: ProductRecordSourceCode | string;
  legacyCode?: string | null;
  legacySystem?: string | null;
  migrationDate?: Date | null;
  migrationBatch?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type ProductUpdateValues = {
  productName?: string;
  shortName?: string | null;
  description?: string | null;
  statusCode?: ProductStatusCode | string;
  ownerPartyId?: string | null;
  defaultCurrency?: string | null;
  launchDate?: string | null;
  retirementDate?: string | null;
  isSellable?: boolean;
  isPurchasable?: boolean;
  isBookable?: boolean;
  isRentable?: boolean;
  isSubscription?: boolean;
  isDigital?: boolean;
  isActive?: boolean;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  version?: number;
};

export type ProductListQueryFilters = {
  search?: string;
  statusCode?: string;
  productTypeCode?: string;
  recordSource?: string;
  limit?: number;
  offset?: number;
};

export class ProductRepository {
  async insert(values: ProductInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(product)
      .values({
        businessId: values.businessId,
        productCode: values.productCode,
        productName: values.productName,
        shortName: values.shortName ?? null,
        description: values.description ?? null,
        productTypeCode: values.productTypeCode,
        statusCode: values.statusCode,
        ownerPartyId: values.ownerPartyId ?? null,
        defaultCurrency: values.defaultCurrency ?? null,
        launchDate: values.launchDate ?? null,
        retirementDate: values.retirementDate ?? null,
        isSellable: values.isSellable ?? false,
        isPurchasable: values.isPurchasable ?? false,
        isBookable: values.isBookable ?? false,
        isRentable: values.isRentable ?? false,
        isSubscription: values.isSubscription ?? false,
        isDigital: values.isDigital ?? false,
        isActive: values.isActive ?? true,
        recordSource: values.recordSource ?? "PLATFORM_CREATED",
        legacyCode: values.legacyCode ?? null,
        legacySystem: values.legacySystem ?? null,
        migrationDate: values.migrationDate ?? null,
        migrationBatch: values.migrationBatch ?? null,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    productId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(product)
      .where(
        and(
          eq(product.businessId, businessId),
          eq(product.id, productId),
          isNull(product.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByIdIncludingArchived(
    businessId: string,
    productId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(product)
      .where(and(eq(product.businessId, businessId), eq(product.id, productId)))
      .limit(1);

    return row ?? null;
  }

  async findByProductCode(
    businessId: string,
    productCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(product)
      .where(
        and(
          eq(product.businessId, businessId),
          eq(product.productCode, productCode),
          isNull(product.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  private buildListConditions(
    businessId: string,
    filters: ProductListQueryFilters
  ) {
    const conditions = [
      eq(product.businessId, businessId),
      isNull(product.deletedAt),
    ];

    if (filters.statusCode?.trim()) {
      conditions.push(eq(product.statusCode, filters.statusCode.trim()));
    }

    if (filters.productTypeCode?.trim()) {
      conditions.push(
        eq(product.productTypeCode, filters.productTypeCode.trim())
      );
    }

    if (filters.recordSource?.trim()) {
      conditions.push(eq(product.recordSource, filters.recordSource.trim()));
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(product.productCode, term),
          ilike(product.productName, term),
          ilike(product.shortName, term),
          ilike(product.description, term),
          ilike(product.legacyCode, term)
        )!
      );
    }

    return and(...conditions);
  }

  async listByBusinessId(
    businessId: string,
    filters: ProductListQueryFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;

    return dbClient
      .select()
      .from(product)
      .where(this.buildListConditions(businessId, filters))
      .orderBy(desc(product.updatedAt), asc(product.productName))
      .limit(limit)
      .offset(offset);
  }

  async countByBusinessId(
    businessId: string,
    filters: ProductListQueryFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ value: count() })
      .from(product)
      .where(this.buildListConditions(businessId, filters));

    return Number(row?.value ?? 0);
  }

  async listRecentByBusinessId(
    businessId: string,
    limit = 8,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(product)
      .where(and(eq(product.businessId, businessId), isNull(product.deletedAt)))
      .orderBy(desc(product.createdAt))
      .limit(limit);
  }

  async listRecentlyUpdatedByBusinessId(
    businessId: string,
    limit = 8,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(product)
      .where(and(eq(product.businessId, businessId), isNull(product.deletedAt)))
      .orderBy(desc(product.updatedAt), desc(product.productName))
      .limit(limit);
  }

  async countByStatus(
    businessId: string,
    statusCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ value: count() })
      .from(product)
      .where(
        and(
          eq(product.businessId, businessId),
          eq(product.statusCode, statusCode),
          isNull(product.deletedAt)
        )
      );

    return Number(row?.value ?? 0);
  }

  async countByType(
    businessId: string,
    productTypeCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ value: count() })
      .from(product)
      .where(
        and(
          eq(product.businessId, businessId),
          eq(product.productTypeCode, productTypeCode),
          isNull(product.deletedAt)
        )
      );

    return Number(row?.value ?? 0);
  }

  async countGroupedByStatus(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        statusCode: product.statusCode,
        value: count(),
      })
      .from(product)
      .where(and(eq(product.businessId, businessId), isNull(product.deletedAt)))
      .groupBy(product.statusCode);
  }

  async countGroupedByType(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        productTypeCode: product.productTypeCode,
        value: count(),
      })
      .from(product)
      .where(and(eq(product.businessId, businessId), isNull(product.deletedAt)))
      .groupBy(product.productTypeCode);
  }

  async updateById(
    businessId: string,
    productId: string,
    values: ProductUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(product)
      .set({
        ...(values.productName !== undefined
          ? { productName: values.productName }
          : {}),
        ...(values.shortName !== undefined
          ? { shortName: values.shortName }
          : {}),
        ...(values.description !== undefined
          ? { description: values.description }
          : {}),
        ...(values.statusCode !== undefined
          ? { statusCode: values.statusCode }
          : {}),
        ...(values.ownerPartyId !== undefined
          ? { ownerPartyId: values.ownerPartyId }
          : {}),
        ...(values.defaultCurrency !== undefined
          ? { defaultCurrency: values.defaultCurrency }
          : {}),
        ...(values.launchDate !== undefined
          ? { launchDate: values.launchDate }
          : {}),
        ...(values.retirementDate !== undefined
          ? { retirementDate: values.retirementDate }
          : {}),
        ...(values.isSellable !== undefined
          ? { isSellable: values.isSellable }
          : {}),
        ...(values.isPurchasable !== undefined
          ? { isPurchasable: values.isPurchasable }
          : {}),
        ...(values.isBookable !== undefined
          ? { isBookable: values.isBookable }
          : {}),
        ...(values.isRentable !== undefined
          ? { isRentable: values.isRentable }
          : {}),
        ...(values.isSubscription !== undefined
          ? { isSubscription: values.isSubscription }
          : {}),
        ...(values.isDigital !== undefined
          ? { isDigital: values.isDigital }
          : {}),
        ...(values.isActive !== undefined ? { isActive: values.isActive } : {}),
        ...(values.updatedBy !== undefined
          ? { updatedBy: values.updatedBy }
          : {}),
        ...(values.deletedAt !== undefined
          ? { deletedAt: values.deletedAt }
          : {}),
        version: values.version ?? sql`${product.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(product.businessId, businessId), eq(product.id, productId)))
      .returning();

    return row ?? null;
  }

  async existsProductCode(
    businessId: string,
    productCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ id: product.id })
      .from(product)
      .where(
        and(
          eq(product.businessId, businessId),
          eq(product.productCode, productCode)
        )
      )
      .limit(1);

    return Boolean(row);
  }
}

export function createProductRepository(): ProductRepository {
  return new ProductRepository();
}
