/**
 * Purpose:
 * Persist and read Product Timeline rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  PRODUCT_TIMELINE_DEFAULT_PAGE_SIZE,
  PRODUCT_TIMELINE_VISIBILITY,
} from "@/core/product-timeline/constants";
import type { ProductTimelineListFilters } from "@/core/product-timeline/types";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { productTimeline } from "@/db/schema/product-timeline";

type DbClient = PostgresJsDatabase<typeof schema>;

export type ProductTimelineInsertValues = {
  businessId: string;
  productId: string;
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
  updatedBy?: string | null;
};

export class ProductTimelineRepository {
  async insert(
    values: ProductTimelineInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(productTimeline)
      .values({
        businessId: values.businessId,
        productId: values.productId,
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
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  private buildListConditions(
    businessId: string,
    productId: string,
    filters: ProductTimelineListFilters
  ) {
    const conditions = [
      eq(productTimeline.businessId, businessId),
      eq(productTimeline.productId, productId),
      isNull(productTimeline.deletedAt),
      eq(productTimeline.visibility, PRODUCT_TIMELINE_VISIBILITY.STANDARD),
    ];

    if (filters.category?.trim()) {
      conditions.push(
        eq(productTimeline.eventCategory, filters.category.trim())
      );
    }

    if (filters.sourceModule?.trim()) {
      conditions.push(
        eq(productTimeline.sourceModule, filters.sourceModule.trim())
      );
    }

    if (filters.dateFrom?.trim()) {
      conditions.push(
        gte(productTimeline.eventDateTime, new Date(filters.dateFrom.trim()))
      );
    }

    if (filters.dateTo?.trim()) {
      const end = new Date(filters.dateTo.trim());
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(productTimeline.eventDateTime, end));
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(productTimeline.summary, term),
          ilike(productTimeline.description, term),
          ilike(productTimeline.eventType, term)
        )!
      );
    }

    return and(...conditions);
  }

  async countByProductId(
    businessId: string,
    productId: string,
    filters: ProductTimelineListFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const [result] = await dbClient
      .select({ value: count() })
      .from(productTimeline)
      .where(this.buildListConditions(businessId, productId, filters));

    return Number(result?.value ?? 0);
  }

  async listByProductId(
    businessId: string,
    productId: string,
    filters: ProductTimelineListFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const limit = filters.limit ?? PRODUCT_TIMELINE_DEFAULT_PAGE_SIZE;
    const offset = filters.offset ?? 0;

    return dbClient
      .select()
      .from(productTimeline)
      .where(this.buildListConditions(businessId, productId, filters))
      .orderBy(desc(productTimeline.eventDateTime), desc(productTimeline.id))
      .limit(limit)
      .offset(offset);
  }

  async listDistinctCategoriesByProductId(
    businessId: string,
    productId: string,
    dbClient: DbClient = getDb()
  ) {
    const rows = await dbClient
      .selectDistinct({ eventCategory: productTimeline.eventCategory })
      .from(productTimeline)
      .where(
        and(
          eq(productTimeline.businessId, businessId),
          eq(productTimeline.productId, productId),
          isNull(productTimeline.deletedAt),
          eq(productTimeline.visibility, PRODUCT_TIMELINE_VISIBILITY.STANDARD)
        )
      )
      .orderBy(productTimeline.eventCategory);

    return rows.map((row) => row.eventCategory);
  }

  async listDistinctSourceModulesByProductId(
    businessId: string,
    productId: string,
    dbClient: DbClient = getDb()
  ) {
    const rows = await dbClient
      .selectDistinct({ sourceModule: productTimeline.sourceModule })
      .from(productTimeline)
      .where(
        and(
          eq(productTimeline.businessId, businessId),
          eq(productTimeline.productId, productId),
          isNull(productTimeline.deletedAt),
          eq(productTimeline.visibility, PRODUCT_TIMELINE_VISIBILITY.STANDARD)
        )
      )
      .orderBy(productTimeline.sourceModule);

    return rows.map((row) => row.sourceModule);
  }
}

export function createProductTimelineRepository(): ProductTimelineRepository {
  return new ProductTimelineRepository();
}
