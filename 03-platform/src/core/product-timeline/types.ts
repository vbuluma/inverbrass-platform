/**
 * Purpose:
 * Type contracts for Product Timeline recording and listing.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import type {
  ProductTimelineEventCategory,
  ProductTimelineEventType,
  ProductTimelineSourceModule,
  ProductTimelineVisibility,
} from "@/core/product-timeline/constants";

export type RecordProductTimelineEventPayload = {
  businessId: string;
  productId: string;
  eventType: ProductTimelineEventType | string;
  eventCategory: ProductTimelineEventCategory | string;
  sourceModule: ProductTimelineSourceModule | string;
  summary: string;
  eventDateTime?: Date;
  referenceEntity?: string | null;
  referenceId?: string | null;
  description?: string | null;
  performedByUserId?: string | null;
  performedByName?: string | null;
  visibility?: ProductTimelineVisibility | string;
  systemGenerated?: boolean;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
};

export type ProductTimelineListFilters = {
  category?: string;
  sourceModule?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export type ProductTimelineEventView = {
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

export type ProductTimelineListResult = {
  events: ProductTimelineEventView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
};

export type ProductTimelineFilterOptions = {
  categories: Array<{ code: string; label: string }>;
  sourceModules: Array<{ code: string; label: string }>;
};

export type ProductTimelinePanelView = {
  events: ProductTimelineEventView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
  filterOptions: ProductTimelineFilterOptions;
};
