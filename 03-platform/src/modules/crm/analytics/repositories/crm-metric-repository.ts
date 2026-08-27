/**
 * Purpose:
 * Persist CRM metric definitions and snapshots.
 *
 * Implementation Package:
 * BP-004 / IP-12 – CRM Analytics & Dashboards
 */

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import {
  crmMetricDefinition,
  crmMetricSnapshot,
} from "@/db/schema/crm-analytics";
import type {
  CrmMetricDefinitionInsertValues,
  CrmMetricSnapshotInsertValues,
} from "@/modules/crm/analytics/types";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmMetricDefinitionRepository {
  async insert(
    values: CrmMetricDefinitionInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(crmMetricDefinition)
      .values({
        businessId: values.businessId,
        code: values.code,
        name: values.name,
        description: values.description ?? null,
        metricCategory: values.metricCategory,
        calculationMethod: values.calculationMethod,
        unitOfMeasure: values.unitOfMeasure ?? null,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();
    return row;
  }

  async findByCode(
    businessId: string,
    code: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(crmMetricDefinition)
      .where(
        and(
          eq(crmMetricDefinition.businessId, businessId),
          eq(crmMetricDefinition.code, code),
          isNull(crmMetricDefinition.deletedAt)
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
      .from(crmMetricDefinition)
      .where(
        and(
          eq(crmMetricDefinition.businessId, businessId),
          eq(crmMetricDefinition.isActive, true),
          isNull(crmMetricDefinition.deletedAt)
        )
      )
      .orderBy(crmMetricDefinition.metricCategory, crmMetricDefinition.code);
  }

  async countActive(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(crmMetricDefinition)
      .where(
        and(
          eq(crmMetricDefinition.businessId, businessId),
          eq(crmMetricDefinition.isActive, true),
          isNull(crmMetricDefinition.deletedAt)
        )
      );
    return row?.count ?? 0;
  }
}

export class CrmMetricSnapshotRepository {
  async insert(
    values: CrmMetricSnapshotInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(crmMetricSnapshot)
      .values({
        businessId: values.businessId,
        metricDefinitionId: values.metricDefinitionId,
        partyId: values.partyId ?? null,
        snapshotPeriod: values.snapshotPeriod,
        snapshotDate: values.snapshotDate,
        metricValue: values.metricValue,
        currencyCode: values.currencyCode ?? null,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
      })
      .returning();
    return row;
  }

  async countByBusiness(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(crmMetricSnapshot)
      .where(eq(crmMetricSnapshot.businessId, businessId));
    return row?.count ?? 0;
  }

  async listRecent(
    businessId: string,
    limit = 20,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmMetricSnapshot)
      .where(eq(crmMetricSnapshot.businessId, businessId))
      .orderBy(desc(crmMetricSnapshot.createdAt))
      .limit(limit);
  }
}

export function createCrmMetricDefinitionRepository() {
  return new CrmMetricDefinitionRepository();
}

export function createCrmMetricSnapshotRepository() {
  return new CrmMetricSnapshotRepository();
}
