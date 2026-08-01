/**
 * Purpose:
 * Product Foundation constants — internal Offering Engine (ENG-003f).
 *
 * Note: Database tables use `product_*` (frozen schema). Architecture docs and
 * developer-facing types refer to the Offering Engine.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

export const PRODUCT_TYPE_CODES = {
  PHYSICAL_PRODUCT: "PHYSICAL_PRODUCT",
  SERVICE: "SERVICE",
  DIGITAL_PRODUCT: "DIGITAL_PRODUCT",
  RENTAL_ASSET: "RENTAL_ASSET",
  SUBSCRIPTION: "SUBSCRIPTION",
  MEMBERSHIP: "MEMBERSHIP",
  INSURANCE: "INSURANCE",
  LOAN_PRODUCT: "LOAN_PRODUCT",
  PROPERTY: "PROPERTY",
  COURSE: "COURSE",
  OTHER: "OTHER",
} as const;

export type ProductTypeCode =
  (typeof PRODUCT_TYPE_CODES)[keyof typeof PRODUCT_TYPE_CODES];

export const PRODUCT_STATUS_CODES = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  DISCONTINUED: "DISCONTINUED",
  ARCHIVED: "ARCHIVED",
} as const;

export type ProductStatusCode =
  (typeof PRODUCT_STATUS_CODES)[keyof typeof PRODUCT_STATUS_CODES];

export const PRODUCT_RECORD_SOURCE_CODES = {
  MIGRATED: "MIGRATED",
  PLATFORM_CREATED: "PLATFORM_CREATED",
  API: "API",
} as const;

export type ProductRecordSourceCode =
  (typeof PRODUCT_RECORD_SOURCE_CODES)[keyof typeof PRODUCT_RECORD_SOURCE_CODES];

export const PRODUCT_CLASSIFICATION_STATUS_CODES = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  ARCHIVED: "ARCHIVED",
  DEPRECATED: "DEPRECATED",
} as const;

export type ProductClassificationStatusCode =
  (typeof PRODUCT_CLASSIFICATION_STATUS_CODES)[keyof typeof PRODUCT_CLASSIFICATION_STATUS_CODES];

export const PRODUCT_CLASSIFICATION_APPROVAL_STATUS_CODES = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  NOT_REQUIRED: "NOT_REQUIRED",
} as const;

export type ProductClassificationApprovalStatusCode =
  (typeof PRODUCT_CLASSIFICATION_APPROVAL_STATUS_CODES)[keyof typeof PRODUCT_CLASSIFICATION_APPROVAL_STATUS_CODES];

export const PRODUCT_CLASSIFICATION_TYPE_CODES = {
  CATEGORY: "CATEGORY",
  SUB_CATEGORY: "SUB_CATEGORY",
  COLLECTION: "COLLECTION",
  BRAND: "BRAND",
  PRODUCT_FAMILY: "PRODUCT_FAMILY",
  PRODUCT_LINE: "PRODUCT_LINE",
  DEPARTMENT: "DEPARTMENT",
  SEGMENT: "SEGMENT",
  SERIES: "SERIES",
  MODEL: "MODEL",
} as const;

export type ProductClassificationTypeCode =
  (typeof PRODUCT_CLASSIFICATION_TYPE_CODES)[keyof typeof PRODUCT_CLASSIFICATION_TYPE_CODES];

export const PRODUCT_CLASSIFICATION_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", available: true },
  { id: "children", label: "Child Categories", available: true },
  { id: "assigned-products", label: "Assigned Products", available: true },
  { id: "timeline", label: "Timeline", available: true },
  { id: "audit-history", label: "Audit History", available: true },
] as const;

export const PRODUCT_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", available: true, futureIp: null },
  {
    id: "classification",
    label: "Catalogue Structure",
    available: true,
    futureIp: null,
  },
  { id: "units", label: "Units", available: true, futureIp: null },
  {
    id: "attributes",
    label: "Attributes",
    available: false,
    futureIp: "IP-004",
  },
  { id: "variants", label: "Variants", available: false, futureIp: "IP-005" },
  { id: "bundles", label: "Bundles", available: false, futureIp: "IP-006" },
  {
    id: "lifecycle",
    label: "Lifecycle",
    available: true,
    futureIp: null,
  },
  {
    id: "documents",
    label: "Documents",
    available: true,
    futureIp: null,
  },
  {
    id: "compliance",
    label: "Compliance",
    available: true,
    futureIp: null,
  },
  { id: "timeline", label: "Timeline", available: true, futureIp: null },
  {
    id: "audit-history",
    label: "Audit History",
    available: true,
    futureIp: null,
  },
  {
    id: "relationships",
    label: "Relationships",
    available: true,
    futureIp: null,
  },
  { id: "pricing", label: "Pricing", available: false, futureIp: null },
  {
    id: "analytics",
    label: "Analytics",
    available: false,
    futureIp: "IP-015",
  },
] as const;

export const UNIT_STATUS_CODES = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  ARCHIVED: "ARCHIVED",
} as const;

export type UnitStatusCode =
  (typeof UNIT_STATUS_CODES)[keyof typeof UNIT_STATUS_CODES];

export const UNIT_CATEGORY_STATUS_CODES = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  ARCHIVED: "ARCHIVED",
} as const;

export type UnitCategoryStatusCode =
  (typeof UNIT_CATEGORY_STATUS_CODES)[keyof typeof UNIT_CATEGORY_STATUS_CODES];

export const UNIT_ROUNDING_RULES = {
  HALF_UP: "HALF_UP",
  HALF_DOWN: "HALF_DOWN",
  CEILING: "CEILING",
  FLOOR: "FLOOR",
  TRUNCATE: "TRUNCATE",
} as const;

export type UnitRoundingRule =
  (typeof UNIT_ROUNDING_RULES)[keyof typeof UNIT_ROUNDING_RULES];

export const PRODUCT_DEFAULT_PAGE_SIZE = 25;

/** IP-008 — Product Lifecycle Management */
export const PRODUCT_LIFECYCLE_STATE_CODES = {
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  DEPRECATED: "DEPRECATED",
  DISCONTINUED: "DISCONTINUED",
  ARCHIVED: "ARCHIVED",
} as const;

export type ProductLifecycleStateCode =
  (typeof PRODUCT_LIFECYCLE_STATE_CODES)[keyof typeof PRODUCT_LIFECYCLE_STATE_CODES];

export const PRODUCT_LIFECYCLE_APPROVAL_STATUS_CODES = {
  NOT_REQUIRED: "NOT_REQUIRED",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export type ProductLifecycleApprovalStatusCode =
  (typeof PRODUCT_LIFECYCLE_APPROVAL_STATUS_CODES)[keyof typeof PRODUCT_LIFECYCLE_APPROVAL_STATUS_CODES];

export const PRODUCT_LIFECYCLE_RETIREMENT_REASONS = {
  REPLACEMENT: "REPLACEMENT",
  REGULATORY: "REGULATORY",
  BUSINESS_DECISION: "BUSINESS_DECISION",
  EXPIRED: "EXPIRED",
  MERGED: "MERGED",
  OTHER: "OTHER",
} as const;

export type ProductLifecycleRetirementReason =
  (typeof PRODUCT_LIFECYCLE_RETIREMENT_REASONS)[keyof typeof PRODUCT_LIFECYCLE_RETIREMENT_REASONS];

export const PRODUCT_LIFECYCLE_SCHEDULED_ACTIONS = {
  ACTIVATE: "ACTIVATE",
  SUSPEND: "SUSPEND",
  ARCHIVE: "ARCHIVE",
} as const;

export type ProductLifecycleScheduledAction =
  (typeof PRODUCT_LIFECYCLE_SCHEDULED_ACTIONS)[keyof typeof PRODUCT_LIFECYCLE_SCHEDULED_ACTIONS];

export const PRODUCT_LIFECYCLE_EVENT_TYPES = {
  LIFECYCLE_CREATED: "LIFECYCLE_CREATED",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  ACTIVATED: "ACTIVATED",
  SUSPENDED: "SUSPENDED",
  REACTIVATED: "REACTIVATED",
  DEPRECATED: "DEPRECATED",
  DISCONTINUED: "DISCONTINUED",
  ARCHIVED: "ARCHIVED",
  VERSION_CREATED: "VERSION_CREATED",
  REPLACEMENT_ASSIGNED: "REPLACEMENT_ASSIGNED",
  SCHEDULE_SET: "SCHEDULE_SET",
} as const;

export type ProductLifecycleEventType =
  (typeof PRODUCT_LIFECYCLE_EVENT_TYPES)[keyof typeof PRODUCT_LIFECYCLE_EVENT_TYPES];

/** Configuration-driven lifecycle policies (ENG-003a target) */
export const DEFAULT_PRODUCT_LIFECYCLE_POLICIES = {
  approvalRequiredBeforeActivation: true,
  allowDirectActivation: false,
  maximumActiveVersions: 1,
  allowReactivationFromSuspended: true,
} as const;

export type ProductLifecyclePolicies = typeof DEFAULT_PRODUCT_LIFECYCLE_POLICIES;

/** IP-009 — Offering Documents */
export const OFFERING_DOCUMENT_STATUS_CODES = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  EXPIRED: "EXPIRED",
} as const;

export type OfferingDocumentStatusCode =
  (typeof OFFERING_DOCUMENT_STATUS_CODES)[keyof typeof OFFERING_DOCUMENT_STATUS_CODES];

export const OFFERING_DOCUMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const OFFERING_DOCUMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const OFFERING_DOCUMENT_STORAGE_BUCKET = "offering-documents";

export const OFFERING_TYPE_CODES = {
  PRODUCT: "PRODUCT",
} as const;

/** IP-010 — Offering Relationships */
export const OFFERING_RELATIONSHIP_STATUS_CODES = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type OfferingRelationshipStatusCode =
  (typeof OFFERING_RELATIONSHIP_STATUS_CODES)[keyof typeof OFFERING_RELATIONSHIP_STATUS_CODES];

export const STORAGE_PROVIDER_CODES = {
  SUPABASE: "SUPABASE",
} as const;
