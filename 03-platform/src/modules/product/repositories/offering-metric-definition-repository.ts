/**
 * Purpose:
 * Persist and read offering metric definition rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-012 – Offering Analytics & Performance
 */

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { offeringMetricDefinition } from "@/db/schema/offering-metric-definition";

type DbClient = PostgresJsDatabase<typeof schema>;

export type OfferingMetricDefinitionInsertValues = {
  businessId: string;
  code: string;
  name: string;
  description?: string | null;
  metricCategory: string;
  calculationMethod: string;
  unitOfMeasure?: string | null;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type OfferingMetricDefinitionUpdateValues = {
  name?: string;
  description?: string | null;
  metricCategory?: string;
  calculationMethod?: string;
  unitOfMeasure?: string | null;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export class OfferingMetricDefinitionRepository {
  async insert(
    values: OfferingMetricDefinitionInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(offeringMetricDefinition)
      .values({
        businessId: values.businessId,
        code: values.code,
        name: values.name,
        description: values.description ?? null,
        metricCategory: values.metricCategory,
        calculationMethod: values.calculationMethod,
        unitOfMeasure: values.unitOfMeasure ?? null,
        isActive: values.isActive ?? true,
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
      .from(offeringMetricDefinition)
      .where(
        and(
          eq(offeringMetricDefinition.businessId, businessId),
          eq(offeringMetricDefinition.id, definitionId),
          isNull(offeringMetricDefinition.deletedAt)
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
      .from(offeringMetricDefinition)
      .where(
        and(
          eq(offeringMetricDefinition.businessId, businessId),
          eq(offeringMetricDefinition.code, code),
          isNull(offeringMetricDefinition.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listActiveByBusinessId(
    businessId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(offeringMetricDefinition)
      .where(
        and(
          eq(offeringMetricDefinition.businessId, businessId),
          eq(offeringMetricDefinition.isActive, true),
          isNull(offeringMetricDefinition.deletedAt)
        )
      )
      .orderBy(asc(offeringMetricDefinition.metricCategory), asc(offeringMetricDefinition.name));
  }

  async listByBusinessId(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(offeringMetricDefinition)
      .where(
        and(
          eq(offeringMetricDefinition.businessId, businessId),
          isNull(offeringMetricDefinition.deletedAt)
        )
      )
      .orderBy(asc(offeringMetricDefinition.metricCategory), asc(offeringMetricDefinition.name));
  }

  async updateById(
    businessId: string,
    definitionId: string,
    values: OfferingMetricDefinitionUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(offeringMetricDefinition)
      .set({
        ...values,
        updatedAt: new Date(),
        version: sql`${offeringMetricDefinition.version} + 1`,
      })
      .where(
        and(
          eq(offeringMetricDefinition.businessId, businessId),
          eq(offeringMetricDefinition.id, definitionId),
          isNull(offeringMetricDefinition.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async countActive(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(offeringMetricDefinition)
      .where(
        and(
          eq(offeringMetricDefinition.businessId, businessId),
          eq(offeringMetricDefinition.isActive, true),
          isNull(offeringMetricDefinition.deletedAt)
        )
      );

    return row?.count ?? 0;
  }
}

export function createOfferingMetricDefinitionRepository() {
  return new OfferingMetricDefinitionRepository();
}
