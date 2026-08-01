/**
 * Purpose:
 * Persist product attribute value assignments (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import { and, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { productAttributeAssignment } from "@/db/schema/product-attribute-assignment";
import { productAttributeDefinition } from "@/db/schema/product-attribute-definition";

type DbClient = PostgresJsDatabase<typeof schema>;

export type AttributeAssignmentInsertValues = {
  businessId: string;
  productId: string;
  attributeDefinitionId: string;
  attributeValue?: unknown;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type AttributeAssignmentUpdateValues = {
  attributeValue?: unknown;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export class AttributeAssignmentRepository {
  async insert(
    values: AttributeAssignmentInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(productAttributeAssignment)
      .values({
        businessId: values.businessId,
        productId: values.productId,
        attributeDefinitionId: values.attributeDefinitionId,
        attributeValue: values.attributeValue ?? null,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findByProductAndDefinition(
    businessId: string,
    productId: string,
    definitionId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(productAttributeAssignment)
      .where(
        and(
          eq(productAttributeAssignment.businessId, businessId),
          eq(productAttributeAssignment.productId, productId),
          eq(productAttributeAssignment.attributeDefinitionId, definitionId),
          isNull(productAttributeAssignment.deletedAt)
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
        assignment: productAttributeAssignment,
        definition: productAttributeDefinition,
      })
      .from(productAttributeAssignment)
      .innerJoin(
        productAttributeDefinition,
        eq(
          productAttributeAssignment.attributeDefinitionId,
          productAttributeDefinition.id
        )
      )
      .where(
        and(
          eq(productAttributeAssignment.businessId, businessId),
          eq(productAttributeAssignment.productId, productId),
          isNull(productAttributeAssignment.deletedAt),
          isNull(productAttributeDefinition.deletedAt)
        )
      );
  }

  async update(
    businessId: string,
    assignmentId: string,
    values: AttributeAssignmentUpdateValues,
    expectedVersion: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(productAttributeAssignment)
      .set({
        attributeValue: values.attributeValue,
        metadata: values.metadata,
        updatedBy: values.updatedBy,
        updatedAt: new Date(),
        version: sql`${productAttributeAssignment.version} + 1`,
      })
      .where(
        and(
          eq(productAttributeAssignment.businessId, businessId),
          eq(productAttributeAssignment.id, assignmentId),
          eq(productAttributeAssignment.version, expectedVersion),
          isNull(productAttributeAssignment.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async searchByAttributeValue(
    businessId: string,
    attributeCode: string,
    attributeValue: unknown,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select({
        assignment: productAttributeAssignment,
        definitionCode: productAttributeDefinition.code,
        definitionName: productAttributeDefinition.name,
      })
      .from(productAttributeAssignment)
      .innerJoin(
        productAttributeDefinition,
        eq(
          productAttributeAssignment.attributeDefinitionId,
          productAttributeDefinition.id
        )
      )
      .where(
        and(
          eq(productAttributeAssignment.businessId, businessId),
          eq(productAttributeDefinition.code, attributeCode),
          sql`${productAttributeAssignment.attributeValue} @> ${JSON.stringify(attributeValue)}::jsonb OR ${productAttributeAssignment.attributeValue} = ${JSON.stringify(attributeValue)}::jsonb`,
          isNull(productAttributeAssignment.deletedAt),
          isNull(productAttributeDefinition.deletedAt)
        )
      );
  }
}

export function createAttributeAssignmentRepository() {
  return new AttributeAssignmentRepository();
}
