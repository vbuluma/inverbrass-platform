/**
 * Purpose:
 * Types for Unit of Measure Timeline.
 */

export type RecordUnitTimelineEventPayload = {
  businessId: string;
  unitId: string;
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

export type UnitTimelineEventView = {
  id: string;
  eventDateTime: string;
  eventType: string;
  eventCategory: string;
  sourceModule: string;
  summary: string;
  description: string | null;
  performedByName: string | null;
};

export type UnitTimelinePanelView = {
  events: UnitTimelineEventView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
};

export type UnitTimelineListFilters = {
  eventType?: string;
  eventCategory?: string;
  limit?: number;
  offset?: number;
};
