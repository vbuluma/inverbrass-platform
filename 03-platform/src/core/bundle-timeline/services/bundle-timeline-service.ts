/**
 * Purpose:
 * Record and list Bundle Timeline events.
 */

import { BUNDLE_TIMELINE_VISIBILITY } from "@/core/bundle-timeline/constants";
import { createBundleTimelineRepository } from "@/core/bundle-timeline/repositories/bundle-timeline-repository";
import type {
  BundleTimelineListFilters,
  BundleTimelinePanelView,
  RecordBundleTimelineEventPayload,
} from "@/core/bundle-timeline/types";

export class BundleTimelineService {
  constructor(private readonly repository = createBundleTimelineRepository()) {}

  async recordEvent(payload: RecordBundleTimelineEventPayload) {
    return this.repository.insert({
      businessId: payload.businessId,
      bundleId: payload.bundleId,
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
      visibility: BUNDLE_TIMELINE_VISIBILITY.STANDARD,
      systemGenerated: payload.systemGenerated,
      metadata: payload.metadata,
      createdBy: payload.createdBy,
    });
  }

  async getTimelinePanel(
    businessId: string,
    bundleId: string,
    filters: BundleTimelineListFilters = {}
  ): Promise<BundleTimelinePanelView> {
    const result = await this.repository.listByBundleId(
      businessId,
      bundleId,
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

export function createBundleTimelineService() {
  return new BundleTimelineService();
}
