/**
 * Purpose:
 * Types for Attribute Timeline events.
 */

export type RecordAttributeTimelineEventPayload = {
  businessId: string;
  attributeDefinitionId: string;
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

export type AttributeTimelineEventView = {
  id: string;
  eventDateTime: string;
  eventType: string;
  eventCategory: string;
  sourceModule: string;
  summary: string;
  description: string | null;
  performedByName: string | null;
};

export type AttributeTimelineListFilters = {
  limit?: number;
  offset?: number;
};

export type AttributeTimelinePanelView = {
  events: AttributeTimelineEventView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
};
