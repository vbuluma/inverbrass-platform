/**
 * Purpose:
 * Types for Catalogue Structure Timeline.
 */

export type RecordClassificationTimelineEventPayload = {
  businessId: string;
  classificationId: string;
  eventType: string;
  eventCategory: string;
  sourceModule: string;
  summary: string;
  eventDateTime?: Date;
  referenceEntity?: string | null;
  referenceId?: string | null;
  description?: string | null;
  performedByUserId?: string | null;
  performedByName?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  systemGenerated?: boolean;
};

export type ClassificationTimelineEventView = {
  id: string;
  eventDateTime: string;
  eventType: string;
  eventCategory: string;
  sourceModule: string;
  summary: string;
  description: string | null;
  performedByName: string | null;
};

export type ClassificationTimelinePanelView = {
  events: ClassificationTimelineEventView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
};

export type ClassificationTimelineListFilters = {
  eventType?: string;
  eventCategory?: string;
  limit?: number;
  offset?: number;
};
