/**
 * Purpose:
 * Persist variant timeline events (persistence only).
 */

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { VARIANT_TIMELINE_DEFAULT_PAGE_SIZE } from "@/core/variant-timeline/constants";
import type { VariantTimelineListFilters } from "@/core/variant-timeline/types";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { variantTimeline } from "@/db/schema/variant-timeline";

type DbClient = PostgresJsDatabase<typeof schema>;

export type VariantTimelineInsertValues = {
  businessId: string;
  variantId: string;
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

export class VariantTimelineRepository {
  async insert(
    values: VariantTimelineInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(variantTimeline)
      .values({
        businessId: values.businessId,
        variantId: values.variantId,
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

  async listByVariantId(
    businessId: string,
    variantId: string,
    filters: VariantTimelineListFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const limit = filters.limit ?? VARIANT_TIMELINE_DEFAULT_PAGE_SIZE;
    const offset = filters.offset ?? 0;

    const conditions = and(
      eq(variantTimeline.businessId, businessId),
      eq(variantTimeline.variantId, variantId),
      isNull(variantTimeline.deletedAt)
    );

    const [countRow] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(variantTimeline)
      .where(conditions);

    const rows = await dbClient
      .select()
      .from(variantTimeline)
      .where(conditions)
      .orderBy(desc(variantTimeline.eventDateTime))
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

export function createVariantTimelineRepository() {
  return new VariantTimelineRepository();
}
