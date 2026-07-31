/**
 * Purpose:
 * Persist Unit Timeline rows (persistence only).
 */

import { and, count, desc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  UNIT_TIMELINE_DEFAULT_PAGE_SIZE,
  UNIT_TIMELINE_VISIBILITY,
} from "@/core/unit-timeline/constants";
import type { UnitTimelineListFilters } from "@/core/unit-timeline/types";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { unitTimeline } from "@/db/schema/unit-timeline";

type DbClient = PostgresJsDatabase<typeof schema>;

export type UnitTimelineInsertValues = {
  businessId: string;
  unitId: string;
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
  visibility?: string;
  systemGenerated?: boolean;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
};

export class UnitTimelineRepository {
  async insert(
    values: UnitTimelineInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(unitTimeline)
      .values({
        businessId: values.businessId,
        unitId: values.unitId,
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
        visibility: values.visibility ?? UNIT_TIMELINE_VISIBILITY.STANDARD,
        systemGenerated: values.systemGenerated ?? true,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
      })
      .returning();

    return row;
  }

  async listByUnitId(
    businessId: string,
    unitId: string,
    filters: UnitTimelineListFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const limit = filters.limit ?? UNIT_TIMELINE_DEFAULT_PAGE_SIZE;
    const offset = filters.offset ?? 0;
    const conditions = [
      eq(unitTimeline.businessId, businessId),
      eq(unitTimeline.unitId, unitId),
      isNull(unitTimeline.deletedAt),
    ];

    if (filters.eventType) {
      conditions.push(eq(unitTimeline.eventType, filters.eventType));
    }
    if (filters.eventCategory) {
      conditions.push(eq(unitTimeline.eventCategory, filters.eventCategory));
    }

    const rows = await dbClient
      .select()
      .from(unitTimeline)
      .where(and(...conditions))
      .orderBy(desc(unitTimeline.eventDateTime))
      .limit(limit)
      .offset(offset);

    const [totalRow] = await dbClient
      .select({ value: count() })
      .from(unitTimeline)
      .where(and(...conditions));

    return {
      rows,
      totalCount: Number(totalRow?.value ?? 0),
      limit,
      offset,
    };
  }
}

export function createUnitTimelineRepository() {
  return new UnitTimelineRepository();
}
