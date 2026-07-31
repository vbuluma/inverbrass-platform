/**
 * Purpose:
 * Record and list Catalogue Structure Timeline events.
 */

import {
  CLASSIFICATION_TIMELINE_VISIBILITY,
} from "@/core/product-classification-timeline/constants";
import {
  createProductClassificationTimelineRepository,
} from "@/core/product-classification-timeline/repositories/product-classification-timeline-repository";
import type {
  ClassificationTimelineListFilters,
  ClassificationTimelinePanelView,
  RecordClassificationTimelineEventPayload,
} from "@/core/product-classification-timeline/types";

export class ProductClassificationTimelineService {
  constructor(
    private readonly repository = createProductClassificationTimelineRepository()
  ) {}

  async recordEvent(payload: RecordClassificationTimelineEventPayload) {
    return this.repository.insert({
      businessId: payload.businessId,
      classificationId: payload.classificationId,
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
      visibility: CLASSIFICATION_TIMELINE_VISIBILITY.STANDARD,
      systemGenerated: payload.systemGenerated,
      metadata: payload.metadata,
      createdBy: payload.createdBy,
    });
  }

  async getTimelinePanel(
    businessId: string,
    classificationId: string,
    filters: ClassificationTimelineListFilters = {}
  ): Promise<ClassificationTimelinePanelView> {
    const result = await this.repository.listByClassificationId(
      businessId,
      classificationId,
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

export function createProductClassificationTimelineService() {
  return new ProductClassificationTimelineService();
}
