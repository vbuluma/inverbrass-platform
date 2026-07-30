/**
 * Purpose:
 * Configurable event categories, types, and source modules for Product Timeline.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

export const PRODUCT_TIMELINE_EVENT_CATEGORIES = {
  REGISTRATION: "REGISTRATION",
  LIFECYCLE: "LIFECYCLE",
  GOVERNANCE: "GOVERNANCE",
  OPERATIONS: "OPERATIONS",
} as const;

export type ProductTimelineEventCategory =
  (typeof PRODUCT_TIMELINE_EVENT_CATEGORIES)[keyof typeof PRODUCT_TIMELINE_EVENT_CATEGORIES];

export const PRODUCT_TIMELINE_EVENT_TYPES = {
  /** IP-001 — active */
  PRODUCT_CREATED: "PRODUCT_CREATED",
  PRODUCT_UPDATED: "PRODUCT_UPDATED",
  PRODUCT_ACTIVATED: "PRODUCT_ACTIVATED",
  PRODUCT_SUSPENDED: "PRODUCT_SUSPENDED",
  PRODUCT_ARCHIVED: "PRODUCT_ARCHIVED",
  /** Future IPs — reserved taxonomy (append-only; no schema change required) */
  PRODUCT_PRICE_CHANGED: "PRODUCT_PRICE_CHANGED",
  PRODUCT_OWNER_CHANGED: "PRODUCT_OWNER_CHANGED",
  PRODUCT_STATUS_CHANGED: "PRODUCT_STATUS_CHANGED",
  PRODUCT_ATTRIBUTE_ADDED: "PRODUCT_ATTRIBUTE_ADDED",
  PRODUCT_BUNDLE_ADDED: "PRODUCT_BUNDLE_ADDED",
  PRODUCT_DOCUMENT_UPLOADED: "PRODUCT_DOCUMENT_UPLOADED",
  PRODUCT_PUBLISHED: "PRODUCT_PUBLISHED",
} as const;

export type ProductTimelineEventType =
  (typeof PRODUCT_TIMELINE_EVENT_TYPES)[keyof typeof PRODUCT_TIMELINE_EVENT_TYPES];

export const PRODUCT_TIMELINE_SOURCE_MODULES = {
  PRODUCT_MANAGEMENT: "PRODUCT_MANAGEMENT",
} as const;

export type ProductTimelineSourceModule =
  (typeof PRODUCT_TIMELINE_SOURCE_MODULES)[keyof typeof PRODUCT_TIMELINE_SOURCE_MODULES];

export const PRODUCT_TIMELINE_VISIBILITY = {
  STANDARD: "STANDARD",
  INTERNAL: "INTERNAL",
  RESTRICTED: "RESTRICTED",
} as const;

export type ProductTimelineVisibility =
  (typeof PRODUCT_TIMELINE_VISIBILITY)[keyof typeof PRODUCT_TIMELINE_VISIBILITY];

export const PRODUCT_TIMELINE_DEFAULT_PAGE_SIZE = 20;

export const PRODUCT_TIMELINE_CATEGORY_LABELS: Record<
  ProductTimelineEventCategory,
  string
> = {
  REGISTRATION: "Registration",
  LIFECYCLE: "Lifecycle",
  GOVERNANCE: "Governance",
  OPERATIONS: "Operations",
};

export const PRODUCT_TIMELINE_SOURCE_MODULE_LABELS: Record<
  ProductTimelineSourceModule,
  string
> = {
  PRODUCT_MANAGEMENT: "Product Management",
};
