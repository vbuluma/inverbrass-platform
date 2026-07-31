/**
 * Purpose:
 * Constants for Unit of Measure Timeline (unit-scoped).
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

export const UNIT_TIMELINE_EVENT_CATEGORIES = {
  REGISTRATION: "REGISTRATION",
  LIFECYCLE: "LIFECYCLE",
  OPERATIONS: "OPERATIONS",
} as const;

export type UnitTimelineEventCategory =
  (typeof UNIT_TIMELINE_EVENT_CATEGORIES)[keyof typeof UNIT_TIMELINE_EVENT_CATEGORIES];

export const UNIT_TIMELINE_EVENT_TYPES = {
  UNIT_CREATED: "UNIT_CREATED",
  UNIT_UPDATED: "UNIT_UPDATED",
  UNIT_CONVERSION_CHANGED: "UNIT_CONVERSION_CHANGED",
  UNIT_ACTIVATED: "UNIT_ACTIVATED",
  UNIT_SUSPENDED: "UNIT_SUSPENDED",
  UNIT_ARCHIVED: "UNIT_ARCHIVED",
} as const;

export type UnitTimelineEventType =
  (typeof UNIT_TIMELINE_EVENT_TYPES)[keyof typeof UNIT_TIMELINE_EVENT_TYPES];

export const UNIT_TIMELINE_SOURCE_MODULES = {
  UNITS_OF_MEASURE: "UNITS_OF_MEASURE",
} as const;

export const UNIT_TIMELINE_VISIBILITY = {
  STANDARD: "STANDARD",
} as const;

export const UNIT_TIMELINE_DEFAULT_PAGE_SIZE = 20;

export const UNIT_TIMELINE_EVENT_TYPE_LABELS: Record<UnitTimelineEventType, string> = {
  UNIT_CREATED: "Unit created",
  UNIT_UPDATED: "Unit updated",
  UNIT_CONVERSION_CHANGED: "Conversion changed",
  UNIT_ACTIVATED: "Unit activated",
  UNIT_SUSPENDED: "Unit suspended",
  UNIT_ARCHIVED: "Unit archived",
};
