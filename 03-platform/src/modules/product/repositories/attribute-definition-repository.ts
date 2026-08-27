/**
 * Purpose:
 * Persist and read product attribute definition rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { attributeGroup } from "@/db/schema/attribute-group";
import { productAttributeDefinition } from "@/db/schema/product-attribute-definition";

type DbClient = PostgresJsDatabase<typeof schema>;

export type AttributeDefinitionInsertValues = {
  businessId: string;
  attributeGroupId: string;
  code: string;
  name: string;
  description?: string | null;
  dataType: string;
  validationRule?: Record<string, unknown> | null;
  defaultValue?: string | null;
  displayOrder?: number;
  isMandatory?: boolean;
  isReadOnly?: boolean;
  isHidden?: boolean;
  status: string;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type AttributeDefinitionUpdateValues = {
  name?: string;
  description?: string | null;
  dataType?: string;
  validationRule?: Record<string, unknown> | null;
  defaultValue?: string | null;
  displayOrder?: number;
  isMandatory?: boolean;
  isReadOnly?: boolean;
  isHidden?: boolean;
  status?: string;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export type AttributeDefinitionSearchFilters = {
  query?: string;
  groupId?: string;
  status?: string;
};

export class AttributeDefinitionRepository {
  async insert(
    values: AttributeDefinitionInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(productAttributeDefinition)
      .values({
        businessId: values.businessId,
        attributeGroupId: values.attributeGroupId,
        code: values.code,
        name: values.name,
        description: values.description ?? null,
        dataType: values.dataType,
        validationRule: values.validationRule ?? null,
        defaultValue: values.defaultValue ?? null,
        displayOrder: values.displayOrder ?? 0,
        isMandatory: values.isMandatory ?? false,
        isReadOnly: values.isReadOnly ?? false,
        isHidden: values.isHidden ?? false,
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
    definitionId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(productAttributeDefinition)
      .where(
        and(
          eq(productAttributeDefinition.businessId, businessId),
          eq(productAttributeDefinition.id, definitionId),
          isNull(productAttributeDefinition.deletedAt)
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
      .from(productAttributeDefinition)
      .where(
        and(
          eq(productAttributeDefinition.businessId, businessId),
          eq(productAttributeDefinition.code, code),
          isNull(productAttributeDefinition.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByNameInGroup(
    businessId: string,
    groupId: string,
    name: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(productAttributeDefinition)
      .where(
        and(
          eq(productAttributeDefinition.businessId, businessId),
          eq(productAttributeDefinition.attributeGroupId, groupId),
          eq(productAttributeDefinition.name, name),
          isNull(productAttributeDefinition.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByBusinessId(
    businessId: string,
    filters: AttributeDefinitionSearchFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(productAttributeDefinition.businessId, businessId),
      isNull(productAttributeDefinition.deletedAt),
    ];

    if (filters.groupId) {
      conditions.push(
        eq(productAttributeDefinition.attributeGroupId, filters.groupId)
      );
    }

    if (filters.status) {
      conditions.push(eq(productAttributeDefinition.status, filters.status));
    }

    if (filters.query) {
      const pattern = `%${filters.query.trim()}%`;
      conditions.push(
        or(
          ilike(productAttributeDefinition.code, pattern),
          ilike(productAttributeDefinition.name, pattern)
        )!
      );
    }

    return dbClient
      .select({
        definition: productAttributeDefinition,
        groupCode: attributeGroup.code,
        groupName: attributeGroup.name,
      })
      .from(productAttributeDefinition)
      .innerJoin(
        attributeGroup,
        eq(productAttributeDefinition.attributeGroupId, attributeGroup.id)
      )
      .where(and(...conditions))
      .orderBy(
        asc(productAttributeDefinition.displayOrder),
        asc(productAttributeDefinition.name)
      );
  }

  async listByGroupId(
    businessId: string,
    groupId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(productAttributeDefinition)
      .where(
        and(
          eq(productAttributeDefinition.businessId, businessId),
          eq(productAttributeDefinition.attributeGroupId, groupId),
          isNull(productAttributeDefinition.deletedAt)
        )
      )
      .orderBy(
        asc(productAttributeDefinition.displayOrder),
        asc(productAttributeDefinition.name)
      );
  }

  async update(
    businessId: string,
    definitionId: string,
    values: AttributeDefinitionUpdateValues,
    expectedVersion: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(productAttributeDefinition)
      .set({
        ...values,
        updatedAt: new Date(),
        version: sql`${productAttributeDefinition.version} + 1`,
      })
      .where(
        and(
          eq(productAttributeDefinition.businessId, businessId),
          eq(productAttributeDefinition.id, definitionId),
          eq(productAttributeDefinition.version, expectedVersion),
          isNull(productAttributeDefinition.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async countByStatus(
    businessId: string,
    status: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(productAttributeDefinition)
      .where(
        and(
          eq(productAttributeDefinition.businessId, businessId),
          eq(productAttributeDefinition.status, status),
          isNull(productAttributeDefinition.deletedAt)
        )
      );

    return row?.count ?? 0;
  }

  async countByBusinessId(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(productAttributeDefinition)
      .where(
        and(
          eq(productAttributeDefinition.businessId, businessId),
          isNull(productAttributeDefinition.deletedAt)
        )
      );

    return row?.count ?? 0;
  }
}

export function createAttributeDefinitionRepository() {
  return new AttributeDefinitionRepository();
}
