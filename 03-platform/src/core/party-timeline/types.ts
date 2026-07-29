/**
 * Purpose:
 * Type contracts for Party Timeline recording and listing.
 *
 * Implementation Package:
 * BP-002 / IP-010 – Party Timeline & Activity History
 */

import type {
  PartyTimelineEventCategory,
  PartyTimelineEventType,
  PartyTimelineSourceModule,
  PartyTimelineVisibility,
} from "@/core/party-timeline/constants";

export type RecordPartyTimelineEventPayload = {
  businessId: string;
  partyId: string;
  eventType: PartyTimelineEventType | string;
  eventCategory: PartyTimelineEventCategory | string;
  sourceModule: PartyTimelineSourceModule | string;
  summary: string;
  eventDateTime?: Date;
  referenceEntity?: string | null;
  referenceId?: string | null;
  description?: string | null;
  performedByUserId?: string | null;
  performedByName?: string | null;
  visibility?: PartyTimelineVisibility | string;
  systemGenerated?: boolean;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
};

export type PartyTimelineListFilters = {
  category?: string;
  sourceModule?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export type PartyTimelineEventView = {
  id: string;
  eventDateTime: string;
  eventType: string;
  eventCategory: string;
  eventCategoryLabel: string;
  sourceModule: string;
  sourceModuleLabel: string;
  referenceEntity: string | null;
  referenceId: string | null;
  summary: string;
  description: string | null;
  performedByName: string | null;
  visibility: string;
  systemGenerated: boolean;
  metadata: Record<string, unknown> | null;
};

export type PartyTimelineListResult = {
  events: PartyTimelineEventView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
};

export type PartyTimelineFilterOptions = {
  categories: Array<{ code: string; label: string }>;
  sourceModules: Array<{ code: string; label: string }>;
};

export type PartyTimelinePanelView = {
  events: PartyTimelineEventView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
  filterOptions: PartyTimelineFilterOptions;
};
