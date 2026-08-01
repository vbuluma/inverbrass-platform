/**
 * Purpose:
 * Record and list Variant Timeline events.
 */

import { VARIANT_TIMELINE_VISIBILITY } from "@/core/variant-timeline/constants";
import { createVariantTimelineRepository } from "@/core/variant-timeline/repositories/variant-timeline-repository";
import type {
  RecordVariantTimelineEventPayload,
  VariantTimelineListFilters,
  VariantTimelinePanelView,
} from "@/core/variant-timeline/types";

export class VariantTimelineService {
  constructor(
    private readonly repository = createVariantTimelineRepository()
  ) {}

  async recordEvent(payload: RecordVariantTimelineEventPayload) {
    return this.repository.insert({
      businessId: payload.businessId,
      variantId: payload.variantId,
      eventDateTime: payload.eventDateTime ?? new Date(),
      eventType: payload.eventType,
      eventCategory: payload.eventCategory,
      sourceModule: payload.sourceModule,
      referenceEntity: payload.referenceEntity,
      referenceId: payload.referenceId,
      summary: payload.summary,
      description: payload.description,
      performedByUserId: payload.performedByUserId,
      performedByName: payload.performedByName,
      visibility: VARIANT_TIMELINE_VISIBILITY.STANDARD,
      systemGenerated: payload.systemGenerated,
      metadata: payload.metadata,
      createdBy: payload.createdBy,
    });
  }

  async getTimelinePanel(
    businessId: string,
    variantId: string,
    filters: VariantTimelineListFilters = {}
  ): Promise<VariantTimelinePanelView> {
    const result = await this.repository.listByVariantId(
      businessId,
      variantId,
      filters
    );

    return {
      events: result.rows.map((row) => ({
        id: row.id,
        eventDateTime: row.eventDateTime.toISOString(),
        eventType: row.eventType,
        eventCategory: row.eventCategory,
        sourceModule: row.sourceModule,
        summary: row.summary,
        description: row.description,
        performedByName: row.performedByName,
      })),
      totalCount: result.totalCount,
      hasMore: result.offset + result.rows.length < result.totalCount,
      pageSize: result.limit,
      offset: result.offset,
    };
  }
}

export function createVariantTimelineService() {
  return new VariantTimelineService();
}
