/**
 * Purpose:
 * Persist bundle timeline events (persistence only).
 */

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { BUNDLE_TIMELINE_DEFAULT_PAGE_SIZE } from "@/core/bundle-timeline/constants";
import type { BundleTimelineListFilters } from "@/core/bundle-timeline/types";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { bundleTimeline } from "@/db/schema/bundle-timeline";

type DbClient = PostgresJsDatabase<typeof schema>;

export type BundleTimelineInsertValues = {
  businessId: string;
  bundleId: string;
  eventDateTime: Date;
  eventType: string;
  eventCategory: string;
  sourceModule: string;
  referenceEntity?: string | null;
  referenceId?: string | null;
  summary: string;
  description?: string | null;
  performedByUserId?: string | null;
  performedByName?: string | null;
  visibility: string;
  systemGenerated?: boolean;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
};

export class BundleTimelineRepository {
  async insert(
    values: BundleTimelineInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(bundleTimeline)
      .values({
        businessId: values.businessId,
        bundleId: values.bundleId,
        eventDateTime: values.eventDateTime,
        eventType: values.eventType,
        eventCategory: values.eventCategory,
        sourceModule: values.sourceModule,
        referenceEntity: values.referenceEntity ?? null,
        referenceId: values.referenceId ?? null,
        summary: values.summary,
        description: values.description ?? null,
        performedByUserId: values.performedByUserId ?? null,
        performedByName: values.performedByName ?? null,
        visibility: values.visibility,
        systemGenerated: values.systemGenerated ?? true,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
      })
      .returning();

    return row;
  }

  async listByBundleId(
    businessId: string,
    bundleId: string,
    filters: BundleTimelineListFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const limit = filters.limit ?? BUNDLE_TIMELINE_DEFAULT_PAGE_SIZE;
    const offset = filters.offset ?? 0;

    const conditions = and(
      eq(bundleTimeline.businessId, businessId),
      eq(bundleTimeline.bundleId, bundleId),
      isNull(bundleTimeline.deletedAt)
    );

    const [countRow] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(bundleTimeline)
      .where(conditions);

    const rows = await dbClient
      .select()
      .from(bundleTimeline)
      .where(conditions)
      .orderBy(desc(bundleTimeline.eventDateTime))
      .limit(limit)
      .offset(offset);

    return {
      rows,
      totalCount: countRow?.count ?? 0,
      limit,
      offset,
    };
  }
}

export function createBundleTimelineRepository() {
  return new BundleTimelineRepository();
}
