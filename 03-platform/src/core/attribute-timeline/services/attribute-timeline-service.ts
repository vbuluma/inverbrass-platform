/**
 * Purpose:
 * Record and list Attribute Timeline events.
 */

import { ATTRIBUTE_TIMELINE_VISIBILITY } from "@/core/attribute-timeline/constants";
import { createAttributeTimelineRepository } from "@/core/attribute-timeline/repositories/attribute-timeline-repository";
import type {
  AttributeTimelineListFilters,
  AttributeTimelinePanelView,
  RecordAttributeTimelineEventPayload,
} from "@/core/attribute-timeline/types";

export class AttributeTimelineService {
  constructor(
    private readonly repository = createAttributeTimelineRepository()
  ) {}

  async recordEvent(payload: RecordAttributeTimelineEventPayload) {
    return this.repository.insert({
      businessId: payload.businessId,
      attributeDefinitionId: payload.attributeDefinitionId,
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
      visibility: ATTRIBUTE_TIMELINE_VISIBILITY.STANDARD,
      systemGenerated: payload.systemGenerated,
      metadata: payload.metadata,
      createdBy: payload.createdBy,
    });
  }

  async getTimelinePanel(
    businessId: string,
    attributeDefinitionId: string,
    filters: AttributeTimelineListFilters = {}
  ): Promise<AttributeTimelinePanelView> {
    const result = await this.repository.listByDefinitionId(
      businessId,
      attributeDefinitionId,
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

export function createAttributeTimelineService() {
  return new AttributeTimelineService();
}
