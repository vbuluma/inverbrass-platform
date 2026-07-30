/**
 * Purpose:
 * Reusable Product Timeline orchestration — record and list events.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import { inArray } from "drizzle-orm";

import {
  PRODUCT_TIMELINE_CATEGORY_LABELS,
  PRODUCT_TIMELINE_DEFAULT_PAGE_SIZE,
  PRODUCT_TIMELINE_SOURCE_MODULE_LABELS,
  PRODUCT_TIMELINE_VISIBILITY,
} from "@/core/product-timeline/constants";
import {
  createProductTimelineRepository,
  type ProductTimelineRepository,
} from "@/core/product-timeline/repositories/product-timeline-repository";
import type {
  ProductTimelineEventView,
  ProductTimelineFilterOptions,
  ProductTimelineListFilters,
  ProductTimelineListResult,
  RecordProductTimelineEventPayload,
} from "@/core/product-timeline/types";
import { getDb } from "@/db/client";
import { platformUser } from "@/db/schema/platform-user";

export class ProductTimelineService {
  constructor(
    private readonly repository: ProductTimelineRepository = createProductTimelineRepository()
  ) {}

  async recordEvent(payload: RecordProductTimelineEventPayload): Promise<void> {
    try {
      await this.repository.insert({
        businessId: payload.businessId,
        productId: payload.productId,
        eventDateTime: payload.eventDateTime ?? new Date(),
        eventType: payload.eventType,
        eventCategory: payload.eventCategory,
        sourceModule: payload.sourceModule,
        referenceEntity: payload.referenceEntity ?? null,
        referenceId: payload.referenceId ?? null,
        summary: payload.summary.trim(),
        description: payload.description?.trim() || null,
        performedByUserId: payload.performedByUserId ?? null,
        performedByName: payload.performedByName?.trim() || null,
        visibility: payload.visibility ?? PRODUCT_TIMELINE_VISIBILITY.STANDARD,
        systemGenerated: payload.systemGenerated ?? true,
        metadata: payload.metadata ?? null,
        createdBy: payload.createdBy ?? payload.performedByUserId ?? null,
        updatedBy: payload.createdBy ?? payload.performedByUserId ?? null,
      });
    } catch (error) {
      const detail = {
        source: "BP-003-IP-001",
        engine: "product-timeline",
        eventType: payload.eventType,
        productId: payload.productId,
        businessId: payload.businessId,
        error: error instanceof Error ? error.message : String(error),
      };

      if (process.env.NODE_ENV === "production") {
        console.error(JSON.stringify(detail));
      } else {
        console.error("[product-timeline] Failed to record event:", detail);
      }
    }
  }

  async listEvents(
    businessId: string,
    productId: string,
    filters: ProductTimelineListFilters = {}
  ): Promise<ProductTimelineListResult> {
    const pageSize = filters.limit ?? PRODUCT_TIMELINE_DEFAULT_PAGE_SIZE;
    const offset = filters.offset ?? 0;
    const listFilters = { ...filters, limit: pageSize, offset };

    const [rows, totalCount] = await Promise.all([
      this.repository.listByProductId(businessId, productId, listFilters),
      this.repository.countByProductId(businessId, productId, {
        category: filters.category,
        sourceModule: filters.sourceModule,
        search: filters.search,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }),
    ]);

    const performerIds = rows
      .filter((row) => !row.performedByName && row.performedByUserId)
      .map((row) => row.performedByUserId as string);

    const performerNames = await this.loadPerformerNames(performerIds);
    const events = rows.map((row) => this.toEventView(row, performerNames));

    return {
      events,
      totalCount,
      hasMore: offset + events.length < totalCount,
      pageSize,
      offset,
    };
  }

  async getFilterOptions(
    businessId: string,
    productId: string
  ): Promise<ProductTimelineFilterOptions> {
    const [categories, sourceModules] = await Promise.all([
      this.repository.listDistinctCategoriesByProductId(businessId, productId),
      this.repository.listDistinctSourceModulesByProductId(businessId, productId),
    ]);

    return {
      categories: categories.map((code) => ({
        code,
        label: this.categoryLabel(code),
      })),
      sourceModules: sourceModules.map((code) => ({
        code,
        label: this.sourceModuleLabel(code),
      })),
    };
  }

  private categoryLabel(code: string): string {
    return (
      PRODUCT_TIMELINE_CATEGORY_LABELS[
        code as keyof typeof PRODUCT_TIMELINE_CATEGORY_LABELS
      ] ?? code.replace(/_/g, " ")
    );
  }

  private sourceModuleLabel(code: string): string {
    return (
      PRODUCT_TIMELINE_SOURCE_MODULE_LABELS[
        code as keyof typeof PRODUCT_TIMELINE_SOURCE_MODULE_LABELS
      ] ?? code.replace(/_/g, " ")
    );
  }

  private async loadPerformerNames(
    platformUserIds: string[]
  ): Promise<Map<string, string>> {
    if (platformUserIds.length === 0) {
      return new Map();
    }

    const uniqueIds = [...new Set(platformUserIds)];
    const rows = await getDb()
      .select({
        id: platformUser.id,
        displayName: platformUser.displayName,
        firstName: platformUser.firstName,
        lastName: platformUser.lastName,
      })
      .from(platformUser)
      .where(inArray(platformUser.id, uniqueIds));

    return new Map(
      rows.map((row) => [
        row.id,
        row.displayName?.trim() ||
          `${row.firstName} ${row.lastName}`.trim(),
      ])
    );
  }

  private toEventView(
    row: {
      id: string;
      eventDateTime: Date;
      eventType: string;
      eventCategory: string;
      sourceModule: string;
      referenceEntity: string | null;
      referenceId: string | null;
      summary: string;
      description: string | null;
      performedByUserId: string | null;
      performedByName: string | null;
      visibility: string;
      systemGenerated: boolean;
      metadata: unknown;
    },
    performerNames: Map<string, string>
  ): ProductTimelineEventView {
    const performedByName =
      row.performedByName?.trim() ||
      (row.performedByUserId
        ? performerNames.get(row.performedByUserId) ?? null
        : null);

    return {
      id: row.id,
      eventDateTime: row.eventDateTime.toISOString(),
      eventType: row.eventType,
      eventCategory: row.eventCategory,
      eventCategoryLabel: this.categoryLabel(row.eventCategory),
      sourceModule: row.sourceModule,
      sourceModuleLabel: this.sourceModuleLabel(row.sourceModule),
      referenceEntity: row.referenceEntity,
      referenceId: row.referenceId,
      summary: row.summary,
      description: row.description,
      performedByName,
      visibility: row.visibility,
      systemGenerated: row.systemGenerated,
      metadata:
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : null,
    };
  }
}

export function createProductTimelineService(): ProductTimelineService {
  return new ProductTimelineService();
}
