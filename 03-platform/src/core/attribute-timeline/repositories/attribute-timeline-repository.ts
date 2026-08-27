/**
 * Purpose:
 * Persist attribute timeline events (persistence only).
 */

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { attributeTimeline } from "@/db/schema/attribute-timeline";
import { ATTRIBUTE_TIMELINE_DEFAULT_PAGE_SIZE } from "@/core/attribute-timeline/constants";
import type { AttributeTimelineListFilters } from "@/core/attribute-timeline/types";

type DbClient = PostgresJsDatabase<typeof schema>;

export type AttributeTimelineInsertValues = {
  businessId: string;
  attributeDefinitionId: string;
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

export class AttributeTimelineRepository {
  async insert(
    values: AttributeTimelineInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(attributeTimeline)
      .values({
        businessId: values.businessId,
        attributeDefinitionId: values.attributeDefinitionId,
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

  async listByDefinitionId(
    businessId: string,
    attributeDefinitionId: string,
    filters: AttributeTimelineListFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const limit = filters.limit ?? ATTRIBUTE_TIMELINE_DEFAULT_PAGE_SIZE;
    const offset = filters.offset ?? 0;

    const conditions = and(
      eq(attributeTimeline.businessId, businessId),
      eq(attributeTimeline.attributeDefinitionId, attributeDefinitionId),
      isNull(attributeTimeline.deletedAt)
    );

    const [countRow] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(attributeTimeline)
      .where(conditions);

    const rows = await dbClient
      .select()
      .from(attributeTimeline)
      .where(conditions)
      .orderBy(desc(attributeTimeline.eventDateTime))
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

export function createAttributeTimelineRepository() {
  return new AttributeTimelineRepository();
}
