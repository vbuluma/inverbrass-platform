/**
 * Purpose:
 * Constants for Product Variant Timeline.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

export const VARIANT_TIMELINE_EVENT_CATEGORIES = {
  REGISTRATION: "REGISTRATION",
  LIFECYCLE: "LIFECYCLE",
  CONFIGURATION: "CONFIGURATION",
} as const;

export type VariantTimelineEventCategory =
  (typeof VARIANT_TIMELINE_EVENT_CATEGORIES)[keyof typeof VARIANT_TIMELINE_EVENT_CATEGORIES];

export const VARIANT_TIMELINE_EVENT_TYPES = {
  VARIANT_CREATED: "VARIANT_CREATED",
  VARIANT_UPDATED: "VARIANT_UPDATED",
  VARIANT_CLONED: "VARIANT_CLONED",
  VARIANT_ACTIVATED: "VARIANT_ACTIVATED",
  VARIANT_SUSPENDED: "VARIANT_SUSPENDED",
  VARIANT_ARCHIVED: "VARIANT_ARCHIVED",
  ATTRIBUTE_OVERRIDE_UPDATED: "ATTRIBUTE_OVERRIDE_UPDATED",
} as const;

export type VariantTimelineEventType =
  (typeof VARIANT_TIMELINE_EVENT_TYPES)[keyof typeof VARIANT_TIMELINE_EVENT_TYPES];

export const VARIANT_TIMELINE_SOURCE_MODULES = {
  PRODUCT_VARIANTS: "PRODUCT_VARIANTS",
} as const;

export const VARIANT_TIMELINE_VISIBILITY = {
  STANDARD: "STANDARD",
} as const;

export const VARIANT_TIMELINE_DEFAULT_PAGE_SIZE = 20;

export const VARIANT_TIMELINE_EVENT_TYPE_LABELS: Record<
  VariantTimelineEventType,
  string
> = {
  VARIANT_CREATED: "Variant created",
  VARIANT_UPDATED: "Variant updated",
  VARIANT_CLONED: "Variant cloned",
  VARIANT_ACTIVATED: "Variant activated",
  VARIANT_SUSPENDED: "Variant suspended",
  VARIANT_ARCHIVED: "Variant archived",
  ATTRIBUTE_OVERRIDE_UPDATED: "Attribute override updated",
};
