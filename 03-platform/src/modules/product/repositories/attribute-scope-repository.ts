/**
 * Purpose:
 * Persist attribute definition scope assignments (product type / classification).
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { productAttributeDefinitionScope } from "@/db/schema/product-attribute-definition-scope";
import { ATTRIBUTE_SCOPE_TYPES } from "@/modules/product/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type AttributeScopeInsertValues = {
  businessId: string;
  attributeDefinitionId: string;
  scopeType: string;
  productTypeCode?: string | null;
  classificationId?: string | null;
  displayOrder?: number;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export class AttributeScopeRepository {
  async insert(values: AttributeScopeInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(productAttributeDefinitionScope)
      .values({
        businessId: values.businessId,
        attributeDefinitionId: values.attributeDefinitionId,
        scopeType: values.scopeType,
        productTypeCode: values.productTypeCode ?? null,
        classificationId: values.classificationId ?? null,
        displayOrder: values.displayOrder ?? 0,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findExisting(
    businessId: string,
    definitionId: string,
    scopeType: string,
    productTypeCode: string | null,
    classificationId: string | null,
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(productAttributeDefinitionScope.businessId, businessId),
      eq(productAttributeDefinitionScope.attributeDefinitionId, definitionId),
      eq(productAttributeDefinitionScope.scopeType, scopeType),
      isNull(productAttributeDefinitionScope.deletedAt),
    ];

    if (scopeType === ATTRIBUTE_SCOPE_TYPES.PRODUCT_TYPE && productTypeCode) {
      conditions.push(
        eq(productAttributeDefinitionScope.productTypeCode, productTypeCode)
      );
    }

    if (scopeType === ATTRIBUTE_SCOPE_TYPES.CLASSIFICATION && classificationId) {
      conditions.push(
        eq(productAttributeDefinitionScope.classificationId, classificationId)
      );
    }

    const [row] = await dbClient
      .select()
      .from(productAttributeDefinitionScope)
      .where(and(...conditions))
      .limit(1);

    return row ?? null;
  }

  async listByDefinitionId(
    businessId: string,
    definitionId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(productAttributeDefinitionScope)
      .where(
        and(
          eq(productAttributeDefinitionScope.businessId, businessId),
          eq(productAttributeDefinitionScope.attributeDefinitionId, definitionId),
          isNull(productAttributeDefinitionScope.deletedAt)
        )
      )
      .orderBy(asc(productAttributeDefinitionScope.displayOrder));
  }

  async listByProductType(
    businessId: string,
    productTypeCode: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(productAttributeDefinitionScope)
      .where(
        and(
          eq(productAttributeDefinitionScope.businessId, businessId),
          eq(productAttributeDefinitionScope.scopeType, ATTRIBUTE_SCOPE_TYPES.PRODUCT_TYPE),
          eq(productAttributeDefinitionScope.productTypeCode, productTypeCode),
          isNull(productAttributeDefinitionScope.deletedAt)
        )
      );
  }

  async listByClassificationId(
    businessId: string,
    classificationId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(productAttributeDefinitionScope)
      .where(
        and(
          eq(productAttributeDefinitionScope.businessId, businessId),
          eq(productAttributeDefinitionScope.scopeType, ATTRIBUTE_SCOPE_TYPES.CLASSIFICATION),
          eq(productAttributeDefinitionScope.classificationId, classificationId),
          isNull(productAttributeDefinitionScope.deletedAt)
        )
      );
  }

  async softDelete(
    businessId: string,
    scopeId: string,
    updatedBy: string | null,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(productAttributeDefinitionScope)
      .set({
        deletedAt: new Date(),
        updatedBy,
        updatedAt: new Date(),
        version: sql`${productAttributeDefinitionScope.version} + 1`,
      })
      .where(
        and(
          eq(productAttributeDefinitionScope.businessId, businessId),
          eq(productAttributeDefinitionScope.id, scopeId),
          isNull(productAttributeDefinitionScope.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }
}

export function createAttributeScopeRepository() {
  return new AttributeScopeRepository();
}
