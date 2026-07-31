/**
 * Purpose:
 * Persist Catalogue Structure Timeline rows (persistence only).
 */

import { and, count, desc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  CLASSIFICATION_TIMELINE_DEFAULT_PAGE_SIZE,
  CLASSIFICATION_TIMELINE_VISIBILITY,
} from "@/core/product-classification-timeline/constants";
import type { ClassificationTimelineListFilters } from "@/core/product-classification-timeline/types";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { productClassificationTimeline } from "@/db/schema/product-classification-timeline";

type DbClient = PostgresJsDatabase<typeof schema>;

export type ClassificationTimelineInsertValues = {
  businessId: string;
  classificationId: string;
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

export class ProductClassificationTimelineRepository {
  async insert(
    values: ClassificationTimelineInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(productClassificationTimeline)
      .values({
        businessId: values.businessId,
        classificationId: values.classificationId,
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
        visibility: values.visibility ?? CLASSIFICATION_TIMELINE_VISIBILITY.STANDARD,
        systemGenerated: values.systemGenerated ?? true,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
      })
      .returning();

    return row;
  }

  async listByClassificationId(
    businessId: string,
    classificationId: string,
    filters: ClassificationTimelineListFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const limit = filters.limit ?? CLASSIFICATION_TIMELINE_DEFAULT_PAGE_SIZE;
    const offset = filters.offset ?? 0;
    const conditions = [
      eq(productClassificationTimeline.businessId, businessId),
      eq(productClassificationTimeline.classificationId, classificationId),
      isNull(productClassificationTimeline.deletedAt),
    ];

    if (filters.eventType) {
      conditions.push(
        eq(productClassificationTimeline.eventType, filters.eventType)
      );
    }
    if (filters.eventCategory) {
      conditions.push(
        eq(productClassificationTimeline.eventCategory, filters.eventCategory)
      );
    }

    const rows = await dbClient
      .select()
      .from(productClassificationTimeline)
      .where(and(...conditions))
      .orderBy(desc(productClassificationTimeline.eventDateTime))
      .limit(limit)
      .offset(offset);

    const [totalRow] = await dbClient
      .select({ value: count() })
      .from(productClassificationTimeline)
      .where(and(...conditions));

    return {
      rows,
      totalCount: Number(totalRow?.value ?? 0),
      limit,
      offset,
    };
  }
}

export function createProductClassificationTimelineRepository() {
  return new ProductClassificationTimelineRepository();
}
