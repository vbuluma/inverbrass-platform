/**
 * Purpose:
 * Persist and read product bundle item rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-006 – Bundles & Packages Engine
 */

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { product } from "@/db/schema/product";
import { productBundle } from "@/db/schema/product-bundle";
import { productBundleItem } from "@/db/schema/product-bundle-item";
import { productVariant } from "@/db/schema/product-variant";

type DbClient = PostgresJsDatabase<typeof schema>;

export type ProductBundleItemInsertValues = {
  bundleId: string;
  productId: string;
  variantId?: string | null;
  quantity: string;
  mandatory?: boolean;
  displayOrder?: number;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type ProductBundleItemUpdateValues = {
  quantity?: string;
  mandatory?: boolean;
  displayOrder?: number;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export class ProductBundleItemRepository {
  async insert(
    values: ProductBundleItemInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(productBundleItem)
      .values({
        bundleId: values.bundleId,
        productId: values.productId,
        variantId: values.variantId ?? null,
        quantity: values.quantity,
        mandatory: values.mandatory ?? true,
        displayOrder: values.displayOrder ?? 0,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async insertMany(
    values: ProductBundleItemInsertValues[],
    dbClient: DbClient = getDb()
  ) {
    if (values.length === 0) {
      return [];
    }

    return dbClient
      .insert(productBundleItem)
      .values(
        values.map((item) => ({
          bundleId: item.bundleId,
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
          mandatory: item.mandatory ?? true,
          displayOrder: item.displayOrder ?? 0,
          metadata: item.metadata ?? null,
          createdBy: item.createdBy ?? null,
          updatedBy: item.updatedBy ?? null,
        }))
      )
      .returning();
  }

  async findById(bundleId: string, itemId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(productBundleItem)
      .where(
        and(
          eq(productBundleItem.bundleId, bundleId),
          eq(productBundleItem.id, itemId),
          isNull(productBundleItem.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByBundleId(bundleId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(productBundleItem)
      .where(
        and(eq(productBundleItem.bundleId, bundleId), isNull(productBundleItem.deletedAt))
      )
      .orderBy(asc(productBundleItem.displayOrder), asc(productBundleItem.createdAt));
  }

  async listDetailedByBundleId(
    businessId: string,
    bundleId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select({
        item: productBundleItem,
        productCode: product.productCode,
        productName: product.productName,
        variantCode: productVariant.variantCode,
        variantName: productVariant.variantName,
      })
      .from(productBundleItem)
      .innerJoin(productBundle, eq(productBundle.id, productBundleItem.bundleId))
      .innerJoin(product, eq(product.id, productBundleItem.productId))
      .leftJoin(
        productVariant,
        eq(productVariant.id, productBundleItem.variantId)
      )
      .where(
        and(
          eq(productBundle.businessId, businessId),
          eq(productBundleItem.bundleId, bundleId),
          isNull(productBundleItem.deletedAt)
        )
      )
      .orderBy(asc(productBundleItem.displayOrder), asc(productBundleItem.createdAt));
  }

  async update(
    bundleId: string,
    itemId: string,
    values: ProductBundleItemUpdateValues,
    expectedVersion: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(productBundleItem)
      .set({
        ...(values.quantity !== undefined ? { quantity: values.quantity } : {}),
        ...(values.mandatory !== undefined ? { mandatory: values.mandatory } : {}),
        ...(values.displayOrder !== undefined
          ? { displayOrder: values.displayOrder }
          : {}),
        ...(values.metadata !== undefined ? { metadata: values.metadata } : {}),
        updatedBy: values.updatedBy ?? null,
        updatedAt: new Date(),
        version: sql`${productBundleItem.version} + 1`,
      })
      .where(
        and(
          eq(productBundleItem.bundleId, bundleId),
          eq(productBundleItem.id, itemId),
          eq(productBundleItem.version, expectedVersion),
          isNull(productBundleItem.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async softDelete(
    bundleId: string,
    itemId: string,
    updatedBy: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(productBundleItem)
      .set({
        deletedAt: new Date(),
        updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(productBundleItem.bundleId, bundleId),
          eq(productBundleItem.id, itemId),
          isNull(productBundleItem.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async findDuplicate(
    bundleId: string,
    productId: string,
    variantId: string | null | undefined,
    excludeItemId?: string,
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(productBundleItem.bundleId, bundleId),
      eq(productBundleItem.productId, productId),
      isNull(productBundleItem.deletedAt),
    ];

    if (variantId) {
      conditions.push(eq(productBundleItem.variantId, variantId));
    } else {
      conditions.push(isNull(productBundleItem.variantId));
    }

    if (excludeItemId) {
      conditions.push(sql`${productBundleItem.id} <> ${excludeItemId}`);
    }

    const [row] = await dbClient
      .select()
      .from(productBundleItem)
      .where(and(...conditions))
      .limit(1);

    return row ?? null;
  }
}

export function createProductBundleItemRepository() {
  return new ProductBundleItemRepository();
}
