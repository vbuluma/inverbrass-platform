/**
 * Purpose:
 * Persist variant attribute override rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

import { and, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { productAttributeDefinition } from "@/db/schema/product-attribute-definition";
import { productVariantAttribute } from "@/db/schema/product-variant-attribute";

type DbClient = PostgresJsDatabase<typeof schema>;

export type ProductVariantAttributeInsertValues = {
  businessId: string;
  variantId: string;
  attributeDefinitionId: string;
  attributeValue?: unknown;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type ProductVariantAttributeUpdateValues = {
  attributeValue?: unknown;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export class ProductVariantAttributeRepository {
  async insert(
    values: ProductVariantAttributeInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(productVariantAttribute)
      .values({
        businessId: values.businessId,
        variantId: values.variantId,
        attributeDefinitionId: values.attributeDefinitionId,
        attributeValue: values.attributeValue ?? null,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async listByVariantId(
    businessId: string,
    variantId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select({
        row: productVariantAttribute,
        definitionCode: productAttributeDefinition.code,
        definitionName: productAttributeDefinition.name,
        dataType: productAttributeDefinition.dataType,
      })
      .from(productVariantAttribute)
      .innerJoin(
        productAttributeDefinition,
        eq(
          productVariantAttribute.attributeDefinitionId,
          productAttributeDefinition.id
        )
      )
      .where(
        and(
          eq(productVariantAttribute.businessId, businessId),
          eq(productVariantAttribute.variantId, variantId),
          isNull(productVariantAttribute.deletedAt),
          isNull(productAttributeDefinition.deletedAt)
        )
      );
  }

  async findByVariantAndDefinition(
    businessId: string,
    variantId: string,
    attributeDefinitionId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(productVariantAttribute)
      .where(
        and(
          eq(productVariantAttribute.businessId, businessId),
          eq(productVariantAttribute.variantId, variantId),
          eq(
            productVariantAttribute.attributeDefinitionId,
            attributeDefinitionId
          ),
          isNull(productVariantAttribute.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async update(
    businessId: string,
    rowId: string,
    values: ProductVariantAttributeUpdateValues,
    expectedVersion: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(productVariantAttribute)
      .set({
        attributeValue: values.attributeValue,
        metadata: values.metadata,
        updatedBy: values.updatedBy,
        updatedAt: new Date(),
        version: sql`${productVariantAttribute.version} + 1`,
      })
      .where(
        and(
          eq(productVariantAttribute.businessId, businessId),
          eq(productVariantAttribute.id, rowId),
          eq(productVariantAttribute.version, expectedVersion),
          isNull(productVariantAttribute.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async softDeleteByVariantId(
    businessId: string,
    variantId: string,
    updatedBy: string | null,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .update(productVariantAttribute)
      .set({
        deletedAt: new Date(),
        updatedBy,
        updatedAt: new Date(),
        version: sql`${productVariantAttribute.version} + 1`,
      })
      .where(
        and(
          eq(productVariantAttribute.businessId, businessId),
          eq(productVariantAttribute.variantId, variantId),
          isNull(productVariantAttribute.deletedAt)
        )
      )
      .returning();
  }
}

export function createProductVariantAttributeRepository() {
  return new ProductVariantAttributeRepository();
}
