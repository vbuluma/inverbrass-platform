/**
 * Purpose:
 * Persist and read attribute option rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { productAttributeOption } from "@/db/schema/product-attribute-option";

type DbClient = PostgresJsDatabase<typeof schema>;

export type AttributeOptionInsertValues = {
  attributeDefinitionId: string;
  optionCode: string;
  optionLabel: string;
  displayOrder?: number;
  status: string;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type AttributeOptionUpdateValues = {
  optionLabel?: string;
  displayOrder?: number;
  status?: string;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export class AttributeOptionRepository {
  async insert(
    values: AttributeOptionInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(productAttributeOption)
      .values({
        attributeDefinitionId: values.attributeDefinitionId,
        optionCode: values.optionCode,
        optionLabel: values.optionLabel,
        displayOrder: values.displayOrder ?? 0,
        status: values.status,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(optionId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(productAttributeOption)
      .where(
        and(
          eq(productAttributeOption.id, optionId),
          isNull(productAttributeOption.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByCode(
    definitionId: string,
    optionCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(productAttributeOption)
      .where(
        and(
          eq(productAttributeOption.attributeDefinitionId, definitionId),
          eq(productAttributeOption.optionCode, optionCode),
          isNull(productAttributeOption.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByDefinitionId(
    definitionId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(productAttributeOption)
      .where(
        and(
          eq(productAttributeOption.attributeDefinitionId, definitionId),
          isNull(productAttributeOption.deletedAt)
        )
      )
      .orderBy(
        asc(productAttributeOption.displayOrder),
        asc(productAttributeOption.optionLabel)
      );
  }

  async update(
    optionId: string,
    values: AttributeOptionUpdateValues,
    expectedVersion: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(productAttributeOption)
      .set({
        ...values,
        updatedAt: new Date(),
        version: sql`${productAttributeOption.version} + 1`,
      })
      .where(
        and(
          eq(productAttributeOption.id, optionId),
          eq(productAttributeOption.version, expectedVersion),
          isNull(productAttributeOption.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async softDelete(
    optionId: string,
    updatedBy: string | null,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(productAttributeOption)
      .set({
        deletedAt: new Date(),
        updatedBy,
        updatedAt: new Date(),
        version: sql`${productAttributeOption.version} + 1`,
      })
      .where(
        and(
          eq(productAttributeOption.id, optionId),
          isNull(productAttributeOption.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }
}

export function createAttributeOptionRepository() {
  return new AttributeOptionRepository();
}
