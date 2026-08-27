/**
 * Purpose:
 * Types for Bundle Timeline events.
 */

export type RecordBundleTimelineEventPayload = {
  businessId: string;
  bundleId: string;
  eventType: string;
  eventCategory: string;
  sourceModule: string;
  summary: string;
  description?: string | null;
  referenceEntity?: string | null;
  referenceId?: string | null;
  eventDateTime?: Date;
  performedByUserId?: string | null;
  performedByName?: string | null;
  systemGenerated?: boolean;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
};

export type BundleTimelineEventView = {
  id: string;
  eventDateTime: string;
  eventType: string;
  eventCategory: string;
  sourceModule: string;
  summary: string;
  description: string | null;
  performedByName: string | null;
};

export type BundleTimelineListFilters = {
  limit?: number;
  offset?: number;
};

export type BundleTimelinePanelView = {
  events: BundleTimelineEventView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
};
