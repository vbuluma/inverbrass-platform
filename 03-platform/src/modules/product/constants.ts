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

export const PRODUCT_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", available: true, futureIp: null },
  {
    id: "classification",
    label: "Classification",
    available: false,
    futureIp: "IP-002",
  },
  { id: "units", label: "Units", available: false, futureIp: "IP-003" },
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
  { id: "pricing", label: "Pricing", available: false, futureIp: null },
  {
    id: "analytics",
    label: "Analytics",
    available: false,
    futureIp: "IP-015",
  },
] as const;

export const PRODUCT_DEFAULT_PAGE_SIZE = 25;
