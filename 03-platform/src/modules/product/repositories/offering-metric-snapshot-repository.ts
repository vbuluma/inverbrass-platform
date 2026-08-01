/**
 * Purpose:
 * Persist and read offering metric snapshots (append-only, persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-012 – Offering Analytics & Performance
 */

import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { offeringMetricDefinition } from "@/db/schema/offering-metric-definition";
import { offeringMetricSnapshot } from "@/db/schema/offering-metric-snapshot";
import { product } from "@/db/schema/product";

type DbClient = PostgresJsDatabase<typeof schema>;

export type OfferingMetricSnapshotInsertValues = {
  businessId: string;
  offeringId: string;
  metricDefinitionId: string;
  snapshotPeriod: string;
  snapshotDate: string;
  metricValue: string;
  currencyCode?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
};

export type OfferingMetricSnapshotFilters = {
  offeringId?: string;
  metricDefinitionId?: string;
  metricCategory?: string;
  snapshotPeriod?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type OfferingMetricSnapshotRow = {
  snapshot: typeof offeringMetricSnapshot.$inferSelect;
  metricCode: string;
  metricName: string;
  metricCategory: string;
  unitOfMeasure: string | null;
  offeringCode: string;
  offeringName: string;
};

export class OfferingMetricSnapshotRepository {
  async insert(
    values: OfferingMetricSnapshotInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(offeringMetricSnapshot)
      .values({
        businessId: values.businessId,
        offeringId: values.offeringId,
        metricDefinitionId: values.metricDefinitionId,
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

  async findExisting(
    businessId: string,
    offeringId: string,
    metricDefinitionId: string,
    snapshotPeriod: string,
    snapshotDate: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(offeringMetricSnapshot)
      .where(
        and(
          eq(offeringMetricSnapshot.businessId, businessId),
          eq(offeringMetricSnapshot.offeringId, offeringId),
          eq(offeringMetricSnapshot.metricDefinitionId, metricDefinitionId),
          eq(offeringMetricSnapshot.snapshotPeriod, snapshotPeriod),
          eq(offeringMetricSnapshot.snapshotDate, snapshotDate)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByOfferingId(
    businessId: string,
    offeringId: string,
    filters: OfferingMetricSnapshotFilters = {},
    dbClient: DbClient = getDb()
  ): Promise<OfferingMetricSnapshotRow[]> {
    const conditions = [
      eq(offeringMetricSnapshot.businessId, businessId),
      eq(offeringMetricSnapshot.offeringId, offeringId),
    ];

    if (filters.metricDefinitionId) {
      conditions.push(
        eq(offeringMetricSnapshot.metricDefinitionId, filters.metricDefinitionId)
      );
    }
    if (filters.snapshotPeriod) {
      conditions.push(
        eq(offeringMetricSnapshot.snapshotPeriod, filters.snapshotPeriod)
      );
    }
    if (filters.dateFrom) {
      conditions.push(gte(offeringMetricSnapshot.snapshotDate, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(offeringMetricSnapshot.snapshotDate, filters.dateTo));
    }
    if (filters.metricCategory) {
      conditions.push(
        eq(offeringMetricDefinition.metricCategory, filters.metricCategory)
      );
    }

    return dbClient
      .select({
        snapshot: offeringMetricSnapshot,
        metricCode: offeringMetricDefinition.code,
        metricName: offeringMetricDefinition.name,
        metricCategory: offeringMetricDefinition.metricCategory,
        unitOfMeasure: offeringMetricDefinition.unitOfMeasure,
        offeringCode: product.productCode,
        offeringName: product.productName,
      })
      .from(offeringMetricSnapshot)
      .innerJoin(
        offeringMetricDefinition,
        eq(offeringMetricSnapshot.metricDefinitionId, offeringMetricDefinition.id)
      )
      .innerJoin(product, eq(offeringMetricSnapshot.offeringId, product.id))
      .where(and(...conditions))
      .orderBy(desc(offeringMetricSnapshot.snapshotDate), asc(offeringMetricDefinition.name));
  }

  async listByBusinessId(
    businessId: string,
    filters: OfferingMetricSnapshotFilters = {},
    dbClient: DbClient = getDb()
  ): Promise<OfferingMetricSnapshotRow[]> {
    const conditions = [eq(offeringMetricSnapshot.businessId, businessId)];

    if (filters.offeringId) {
      conditions.push(eq(offeringMetricSnapshot.offeringId, filters.offeringId));
    }
    if (filters.metricDefinitionId) {
      conditions.push(
        eq(offeringMetricSnapshot.metricDefinitionId, filters.metricDefinitionId)
      );
    }
    if (filters.snapshotPeriod) {
      conditions.push(
        eq(offeringMetricSnapshot.snapshotPeriod, filters.snapshotPeriod)
      );
    }
    if (filters.dateFrom) {
      conditions.push(gte(offeringMetricSnapshot.snapshotDate, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(offeringMetricSnapshot.snapshotDate, filters.dateTo));
    }
    if (filters.metricCategory) {
      conditions.push(
        eq(offeringMetricDefinition.metricCategory, filters.metricCategory)
      );
    }

    return dbClient
      .select({
        snapshot: offeringMetricSnapshot,
        metricCode: offeringMetricDefinition.code,
        metricName: offeringMetricDefinition.name,
        metricCategory: offeringMetricDefinition.metricCategory,
        unitOfMeasure: offeringMetricDefinition.unitOfMeasure,
        offeringCode: product.productCode,
        offeringName: product.productName,
      })
      .from(offeringMetricSnapshot)
      .innerJoin(
        offeringMetricDefinition,
        eq(offeringMetricSnapshot.metricDefinitionId, offeringMetricDefinition.id)
      )
      .innerJoin(product, eq(offeringMetricSnapshot.offeringId, product.id))
      .where(and(...conditions))
      .orderBy(desc(offeringMetricSnapshot.snapshotDate), asc(product.productName));
  }

  async countByOffering(
    businessId: string,
    offeringId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(offeringMetricSnapshot)
      .where(
        and(
          eq(offeringMetricSnapshot.businessId, businessId),
          eq(offeringMetricSnapshot.offeringId, offeringId)
        )
      );

    return row?.count ?? 0;
  }
}

export function createOfferingMetricSnapshotRepository() {
  return new OfferingMetricSnapshotRepository();
}
