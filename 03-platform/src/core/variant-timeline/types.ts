/**
 * Purpose:
 * Types for Variant Timeline events.
 */

export type RecordVariantTimelineEventPayload = {
  businessId: string;
  variantId: string;
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

export type VariantTimelineEventView = {
  id: string;
  eventDateTime: string;
  eventType: string;
  eventCategory: string;
  sourceModule: string;
  summary: string;
  description: string | null;
  performedByName: string | null;
};

export type VariantTimelineListFilters = {
  limit?: number;
  offset?: number;
};

export type VariantTimelinePanelView = {
  events: VariantTimelineEventView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
};
