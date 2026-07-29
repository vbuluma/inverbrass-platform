/**
 * Purpose:
 * Configurable event categories, types, and source modules for Party Timeline.
 *
 * Design rationale:
 * BP-002 defines common codes; future Build Packs may introduce additional
 * values without schema changes — all stored as varchar codes.
 *
 * Implementation Package:
 * BP-002 / IP-010 – Party Timeline & Activity History
 */

/** Well-known event categories for BP-002. Additional categories allowed at runtime. */
export const PARTY_TIMELINE_EVENT_CATEGORIES = {
  REGISTRATION: "REGISTRATION",
  COMPLIANCE: "COMPLIANCE",
  COMMUNICATION: "COMMUNICATION",
  RELATIONSHIP: "RELATIONSHIP",
  ORGANIZATION: "ORGANIZATION",
  DOCUMENTS: "DOCUMENTS",
  GROUPS: "GROUPS",
  LIFECYCLE: "LIFECYCLE",
  OPERATIONS: "OPERATIONS",
} as const;

export type PartyTimelineEventCategory =
  (typeof PARTY_TIMELINE_EVENT_CATEGORIES)[keyof typeof PARTY_TIMELINE_EVENT_CATEGORIES];

/** Well-known BP-002 event types. Future modules may use any string code. */
export const PARTY_TIMELINE_EVENT_TYPES = {
  PARTY_CREATED: "PARTY_CREATED",
  PARTY_UPDATED: "PARTY_UPDATED",
  ROLE_ASSIGNED: "ROLE_ASSIGNED",
  ROLE_REMOVED: "ROLE_REMOVED",
  ROLE_UPDATED: "ROLE_UPDATED",
  ROLE_PRIMARY_SET: "ROLE_PRIMARY_SET",
  CONTACT_CREATED: "CONTACT_CREATED",
  CONTACT_UPDATED: "CONTACT_UPDATED",
  CONTACT_VERIFIED: "CONTACT_VERIFIED",
  CONTACT_REMOVED: "CONTACT_REMOVED",
  ADDRESS_CREATED: "ADDRESS_CREATED",
  ADDRESS_UPDATED: "ADDRESS_UPDATED",
  ADDRESS_REMOVED: "ADDRESS_REMOVED",
  RELATIONSHIP_CREATED: "RELATIONSHIP_CREATED",
  RELATIONSHIP_UPDATED: "RELATIONSHIP_UPDATED",
  RELATIONSHIP_REMOVED: "RELATIONSHIP_REMOVED",
  ORGANIZATION_UNIT_CREATED: "ORGANIZATION_UNIT_CREATED",
  ORGANIZATION_UNIT_UPDATED: "ORGANIZATION_UNIT_UPDATED",
  ORGANIZATION_UNIT_REMOVED: "ORGANIZATION_UNIT_REMOVED",
  DOCUMENT_UPLOADED: "DOCUMENT_UPLOADED",
  DOCUMENT_VERIFIED: "DOCUMENT_VERIFIED",
  DOCUMENT_EXPIRED: "DOCUMENT_EXPIRED",
  DOCUMENT_REMOVED: "DOCUMENT_REMOVED",
  GROUP_JOINED: "GROUP_JOINED",
  GROUP_LEFT: "GROUP_LEFT",
  STATUS_CHANGED: "STATUS_CHANGED",
} as const;

export type PartyTimelineEventType =
  (typeof PARTY_TIMELINE_EVENT_TYPES)[keyof typeof PARTY_TIMELINE_EVENT_TYPES];

/** Identifies the originating module for timeline events. */
export const PARTY_TIMELINE_SOURCE_MODULES = {
  PARTY_MANAGEMENT: "PARTY_MANAGEMENT",
} as const;

export type PartyTimelineSourceModule =
  (typeof PARTY_TIMELINE_SOURCE_MODULES)[keyof typeof PARTY_TIMELINE_SOURCE_MODULES];

export const PARTY_TIMELINE_VISIBILITY = {
  STANDARD: "STANDARD",
  INTERNAL: "INTERNAL",
  RESTRICTED: "RESTRICTED",
} as const;

export type PartyTimelineVisibility =
  (typeof PARTY_TIMELINE_VISIBILITY)[keyof typeof PARTY_TIMELINE_VISIBILITY];

/** Default page size for timeline feed pagination. */
export const PARTY_TIMELINE_DEFAULT_PAGE_SIZE = 20;

/** Human-readable labels for event categories in UI filters. */
export const PARTY_TIMELINE_CATEGORY_LABELS: Record<
  PartyTimelineEventCategory,
  string
> = {
  REGISTRATION: "Registration",
  COMPLIANCE: "Compliance",
  COMMUNICATION: "Communication",
  RELATIONSHIP: "Relationship",
  ORGANIZATION: "Organization",
  DOCUMENTS: "Documents",
  GROUPS: "Groups",
  LIFECYCLE: "Lifecycle",
  OPERATIONS: "Operations",
};

/** Human-readable labels for source modules in UI filters. */
export const PARTY_TIMELINE_SOURCE_MODULE_LABELS: Record<
  PartyTimelineSourceModule,
  string
> = {
  PARTY_MANAGEMENT: "Party Management",
};
