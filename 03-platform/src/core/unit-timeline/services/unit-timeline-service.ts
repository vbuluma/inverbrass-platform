/**
 * Purpose:
 * Record and list Unit Timeline events.
 */

import { UNIT_TIMELINE_VISIBILITY } from "@/core/unit-timeline/constants";
import { createUnitTimelineRepository } from "@/core/unit-timeline/repositories/unit-timeline-repository";
import type {
  RecordUnitTimelineEventPayload,
  UnitTimelineListFilters,
  UnitTimelinePanelView,
} from "@/core/unit-timeline/types";

export class UnitTimelineService {
  constructor(
    private readonly repository = createUnitTimelineRepository()
  ) {}

  async recordEvent(payload: RecordUnitTimelineEventPayload) {
    return this.repository.insert({
      businessId: payload.businessId,
      unitId: payload.unitId,
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
      visibility: UNIT_TIMELINE_VISIBILITY.STANDARD,
      systemGenerated: payload.systemGenerated,
      metadata: payload.metadata,
      createdBy: payload.createdBy,
    });
  }

  async getTimelinePanel(
    businessId: string,
    unitId: string,
    filters: UnitTimelineListFilters = {}
  ): Promise<UnitTimelinePanelView> {
    const result = await this.repository.listByUnitId(
      businessId,
      unitId,
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

export function createUnitTimelineService() {
  return new UnitTimelineService();
}
