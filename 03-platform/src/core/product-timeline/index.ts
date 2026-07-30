/**
 * Purpose:
 * Public exports for the reusable Product Timeline capability.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

export {
  PRODUCT_TIMELINE_CATEGORY_LABELS,
  PRODUCT_TIMELINE_DEFAULT_PAGE_SIZE,
  PRODUCT_TIMELINE_EVENT_CATEGORIES,
  PRODUCT_TIMELINE_EVENT_TYPES,
  PRODUCT_TIMELINE_SOURCE_MODULE_LABELS,
  PRODUCT_TIMELINE_SOURCE_MODULES,
  PRODUCT_TIMELINE_VISIBILITY,
} from "@/core/product-timeline/constants";
export type {
  ProductTimelineEventCategory,
  ProductTimelineEventType,
  ProductTimelineSourceModule,
  ProductTimelineVisibility,
} from "@/core/product-timeline/constants";
export {
  createProductTimelineRepository,
  ProductTimelineRepository,
} from "@/core/product-timeline/repositories/product-timeline-repository";
export {
  createProductTimelineService,
  ProductTimelineService,
} from "@/core/product-timeline/services/product-timeline-service";
export type {
  ProductTimelineEventView,
  ProductTimelineFilterOptions,
  ProductTimelineListFilters,
  ProductTimelineListResult,
  ProductTimelinePanelView,
  RecordProductTimelineEventPayload,
} from "@/core/product-timeline/types";
export { buildProductTimelineEventFromContext } from "@/core/product-timeline/helpers";
