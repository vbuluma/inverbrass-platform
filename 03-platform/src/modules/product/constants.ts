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
    id: "documents",
    label: "Documents",
    available: false,
    futureIp: "IP-009",
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
    available: false,
    futureIp: "IP-012",
  },
  { id: "pricing", label: "Pricing", available: true, futureIp: null },
  {
    id: "analytics",
    label: "Analytics",
    available: true,
    futureIp: null,
  },
  {
    id: "governance",
    label: "Governance",
    available: true,
    futureIp: null,
  },
] as const;

export const OFFERING_GOVERNANCE_STATUS_CODES = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  READY: "READY",
  ON_HOLD: "ON_HOLD",
  NON_COMPLIANT: "NON_COMPLIANT",
  ARCHIVED: "ARCHIVED",
} as const;

export type OfferingGovernanceStatusCode =
  (typeof OFFERING_GOVERNANCE_STATUS_CODES)[keyof typeof OFFERING_GOVERNANCE_STATUS_CODES];

export const OFFERING_GOVERNANCE_CHECKLIST_STATUSES = {
  COMPLETED: "COMPLETED",
  INCOMPLETE: "INCOMPLETE",
  WARNING: "WARNING",
} as const;

export type OfferingGovernanceChecklistStatus =
  (typeof OFFERING_GOVERNANCE_CHECKLIST_STATUSES)[keyof typeof OFFERING_GOVERNANCE_CHECKLIST_STATUSES];

export const OFFERING_GOVERNANCE_CHANGE_TYPES = {
  OWNER_CHANGED: "OWNER_CHANGED",
  STEWARD_CHANGED: "STEWARD_CHANGED",
  STATUS_CHANGED: "STATUS_CHANGED",
  READINESS_CHANGED: "READINESS_CHANGED",
  VALIDATION_EXECUTED: "VALIDATION_EXECUTED",
  LOCK_CHANGED: "LOCK_CHANGED",
  NOTES_CHANGED: "NOTES_CHANGED",
} as const;

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

export const PRICING_CATALOGUE_STATUS_CODES = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  ARCHIVED: "ARCHIVED",
} as const;

export type PricingCatalogueStatusCode =
  (typeof PRICING_CATALOGUE_STATUS_CODES)[keyof typeof PRICING_CATALOGUE_STATUS_CODES];

export const PRICING_ITEM_STATUS_CODES = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  ARCHIVED: "ARCHIVED",
} as const;

export type PricingItemStatusCode =
  (typeof PRICING_ITEM_STATUS_CODES)[keyof typeof PRICING_ITEM_STATUS_CODES];

export const PRODUCT_DEFAULT_PAGE_SIZE = 25;

export const OFFERING_METRIC_CATEGORIES = {
  COMMERCIAL: "COMMERCIAL",
  CUSTOMER: "CUSTOMER",
  OPERATIONAL: "OPERATIONAL",
  LIFECYCLE: "LIFECYCLE",
  COMPLIANCE: "COMPLIANCE",
  INVENTORY: "INVENTORY",
  FINANCIAL: "FINANCIAL",
  INDUSTRY_SPECIFIC: "INDUSTRY_SPECIFIC",
} as const;

export type OfferingMetricCategory =
  (typeof OFFERING_METRIC_CATEGORIES)[keyof typeof OFFERING_METRIC_CATEGORIES];

export const OFFERING_SNAPSHOT_PERIODS = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
} as const;

export type OfferingSnapshotPeriod =
  (typeof OFFERING_SNAPSHOT_PERIODS)[keyof typeof OFFERING_SNAPSHOT_PERIODS];

export const OFFERING_METRIC_CALCULATION_METHODS = {
  PLATFORM_DERIVED: "PLATFORM_DERIVED",
  EXTERNAL_MODULE: "EXTERNAL_MODULE",
  MANUAL: "MANUAL",
} as const;

export type OfferingMetricCalculationMethod =
  (typeof OFFERING_METRIC_CALCULATION_METHODS)[keyof typeof OFFERING_METRIC_CALCULATION_METHODS];
