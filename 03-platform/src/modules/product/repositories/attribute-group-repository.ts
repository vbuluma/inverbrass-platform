/**
 * Purpose:
 * Persist and read attribute group rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { attributeGroup } from "@/db/schema/attribute-group";

type DbClient = PostgresJsDatabase<typeof schema>;

export type AttributeGroupInsertValues = {
  businessId: string;
  code: string;
  name: string;
  description?: string | null;
  displayOrder?: number;
  status: string;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type AttributeGroupUpdateValues = {
  name?: string;
  description?: string | null;
  displayOrder?: number;
  status?: string;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export type AttributeGroupSearchFilters = {
  query?: string;
  status?: string;
};

export class AttributeGroupRepository {
  async insert(values: AttributeGroupInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(attributeGroup)
      .values({
        businessId: values.businessId,
        code: values.code,
        name: values.name,
        description: values.description ?? null,
        displayOrder: values.displayOrder ?? 0,
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
    groupId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(attributeGroup)
      .where(
        and(
          eq(attributeGroup.businessId, businessId),
          eq(attributeGroup.id, groupId),
          isNull(attributeGroup.deletedAt)
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
      .from(attributeGroup)
      .where(
        and(
          eq(attributeGroup.businessId, businessId),
          eq(attributeGroup.code, code),
          isNull(attributeGroup.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByBusinessId(
    businessId: string,
    filters: AttributeGroupSearchFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(attributeGroup.businessId, businessId),
      isNull(attributeGroup.deletedAt),
    ];

    if (filters.status) {
      conditions.push(eq(attributeGroup.status, filters.status));
    }

    if (filters.query) {
      const pattern = `%${filters.query.trim()}%`;
      conditions.push(
        or(
          ilike(attributeGroup.code, pattern),
          ilike(attributeGroup.name, pattern)
        )!
      );
    }

    return dbClient
      .select()
      .from(attributeGroup)
      .where(and(...conditions))
      .orderBy(asc(attributeGroup.displayOrder), asc(attributeGroup.name));
  }

  async update(
    businessId: string,
    groupId: string,
    values: AttributeGroupUpdateValues,
    expectedVersion: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(attributeGroup)
      .set({
        ...values,
        updatedAt: new Date(),
        version: sql`${attributeGroup.version} + 1`,
      })
      .where(
        and(
          eq(attributeGroup.businessId, businessId),
          eq(attributeGroup.id, groupId),
          eq(attributeGroup.version, expectedVersion),
          isNull(attributeGroup.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async softDelete(
    businessId: string,
    groupId: string,
    updatedBy: string | null,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(attributeGroup)
      .set({
        deletedAt: new Date(),
        updatedBy,
        updatedAt: new Date(),
        version: sql`${attributeGroup.version} + 1`,
      })
      .where(
        and(
          eq(attributeGroup.businessId, businessId),
          eq(attributeGroup.id, groupId),
          isNull(attributeGroup.deletedAt)
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
      .from(attributeGroup)
      .where(
        and(
          eq(attributeGroup.businessId, businessId),
          eq(attributeGroup.status, status),
          isNull(attributeGroup.deletedAt)
        )
      );

    return row?.count ?? 0;
  }
}

export function createAttributeGroupRepository() {
  return new AttributeGroupRepository();
}
