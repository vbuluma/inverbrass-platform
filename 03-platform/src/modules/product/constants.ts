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
    available: true,
    futureIp: null,
  },
  { id: "variants", label: "Variants", available: true, futureIp: null },
  { id: "bundles", label: "Bundles", available: true, futureIp: null },
  { id: "catalogue", label: "Catalogue", available: true, futureIp: null },
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

export const ATTRIBUTE_GROUP_STATUS_CODES = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  ARCHIVED: "ARCHIVED",
} as const;

export type AttributeGroupStatusCode =
  (typeof ATTRIBUTE_GROUP_STATUS_CODES)[keyof typeof ATTRIBUTE_GROUP_STATUS_CODES];

export const ATTRIBUTE_DEFINITION_STATUS_CODES = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  ARCHIVED: "ARCHIVED",
} as const;

export type AttributeDefinitionStatusCode =
  (typeof ATTRIBUTE_DEFINITION_STATUS_CODES)[keyof typeof ATTRIBUTE_DEFINITION_STATUS_CODES];

export const ATTRIBUTE_OPTION_STATUS_CODES = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;

export type AttributeOptionStatusCode =
  (typeof ATTRIBUTE_OPTION_STATUS_CODES)[keyof typeof ATTRIBUTE_OPTION_STATUS_CODES];

export const ATTRIBUTE_DATA_TYPES = {
  TEXT: "TEXT",
  LONG_TEXT: "LONG_TEXT",
  INTEGER: "INTEGER",
  DECIMAL: "DECIMAL",
  CURRENCY: "CURRENCY",
  PERCENTAGE: "PERCENTAGE",
  BOOLEAN: "BOOLEAN",
  DATE: "DATE",
  DATETIME: "DATETIME",
  EMAIL: "EMAIL",
  PHONE: "PHONE",
  URL: "URL",
  FILE: "FILE",
  IMAGE: "IMAGE",
  JSON: "JSON",
  SELECT: "SELECT",
  MULTI_SELECT: "MULTI_SELECT",
  RADIO: "RADIO",
  CHECKBOX: "CHECKBOX",
} as const;

export type AttributeDataType =
  (typeof ATTRIBUTE_DATA_TYPES)[keyof typeof ATTRIBUTE_DATA_TYPES];

export const ATTRIBUTE_SCOPE_TYPES = {
  PRODUCT_TYPE: "PRODUCT_TYPE",
  CLASSIFICATION: "CLASSIFICATION",
} as const;

export type AttributeScopeType =
  (typeof ATTRIBUTE_SCOPE_TYPES)[keyof typeof ATTRIBUTE_SCOPE_TYPES];

export const VARIANT_STATUS_CODES = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  ARCHIVED: "ARCHIVED",
} as const;

export type VariantStatusCode =
  (typeof VARIANT_STATUS_CODES)[keyof typeof VARIANT_STATUS_CODES];

export const BUNDLE_STATUS_CODES = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  ARCHIVED: "ARCHIVED",
} as const;

export type BundleStatusCode =
  (typeof BUNDLE_STATUS_CODES)[keyof typeof BUNDLE_STATUS_CODES];

export const BUNDLE_TYPE_CODES = {
  STANDARD_PACKAGE: "STANDARD_PACKAGE",
  STARTER_KIT: "STARTER_KIT",
  PROMOTIONAL_BUNDLE: "PROMOTIONAL_BUNDLE",
  SUBSCRIPTION_BUNDLE: "SUBSCRIPTION_BUNDLE",
  CROSS_SELL_BUNDLE: "CROSS_SELL_BUNDLE",
  UPSELL_BUNDLE: "UPSELL_BUNDLE",
  SERVICE_PACKAGE: "SERVICE_PACKAGE",
  COMPOSITE_PRODUCT: "COMPOSITE_PRODUCT",
} as const;

export type BundleTypeCode =
  (typeof BUNDLE_TYPE_CODES)[keyof typeof BUNDLE_TYPE_CODES];

export const BUNDLE_TYPE_LABELS: Record<BundleTypeCode, string> = {
  STANDARD_PACKAGE: "Standard Package",
  STARTER_KIT: "Starter Kit",
  PROMOTIONAL_BUNDLE: "Promotional Bundle",
  SUBSCRIPTION_BUNDLE: "Subscription Bundle",
  CROSS_SELL_BUNDLE: "Cross-Sell Bundle",
  UPSELL_BUNDLE: "Upsell Bundle",
  SERVICE_PACKAGE: "Service Package",
  COMPOSITE_PRODUCT: "Composite Product",
};

export const BUNDLE_PRICING_STRATEGY_CODES = {
  SUM_OF_ITEMS: "SUM_OF_ITEMS",
  FIXED_BUNDLE_PRICE: "FIXED_BUNDLE_PRICE",
  PERCENTAGE_DISCOUNT: "PERCENTAGE_DISCOUNT",
  FUTURE_RULE: "FUTURE_RULE",
} as const;

export type BundlePricingStrategyCode =
  (typeof BUNDLE_PRICING_STRATEGY_CODES)[keyof typeof BUNDLE_PRICING_STRATEGY_CODES];

export const BUNDLE_PRICING_STRATEGY_LABELS: Record<
  BundlePricingStrategyCode,
  string
> = {
  SUM_OF_ITEMS: "Sum of Items",
  FIXED_BUNDLE_PRICE: "Fixed Bundle Price",
  PERCENTAGE_DISCOUNT: "Percentage Discount",
  FUTURE_RULE: "Future Rule",
};

export const BUNDLE_AVAILABILITY_TYPES = {
  ACTIVE: "ACTIVE",
  SEASONAL: "SEASONAL",
  LIMITED_OFFER: "LIMITED_OFFER",
  PERMANENT: "PERMANENT",
} as const;

export type BundleAvailabilityType =
  (typeof BUNDLE_AVAILABILITY_TYPES)[keyof typeof BUNDLE_AVAILABILITY_TYPES];

export const BUNDLE_AVAILABILITY_TYPE_LABELS: Record<
  BundleAvailabilityType,
  string
> = {
  ACTIVE: "Active",
  SEASONAL: "Seasonal",
  LIMITED_OFFER: "Limited Offer",
  PERMANENT: "Permanent",
};

export const CATALOGUE_CHANNEL_STATUS_CODES = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;

export const CATALOGUE_VISIBILITY_CODES = {
  PUBLIC: "PUBLIC",
  REGISTERED_CUSTOMERS: "REGISTERED_CUSTOMERS",
  MEMBERS: "MEMBERS",
  EMPLOYEES: "EMPLOYEES",
  PARTNERS: "PARTNERS",
  BUSINESS_CUSTOMERS: "BUSINESS_CUSTOMERS",
  CUSTOMER_SEGMENT: "CUSTOMER_SEGMENT",
} as const;

export type CatalogueVisibilityCode =
  (typeof CATALOGUE_VISIBILITY_CODES)[keyof typeof CATALOGUE_VISIBILITY_CODES];

export const CATALOGUE_VISIBILITY_LABELS: Record<CatalogueVisibilityCode, string> = {
  PUBLIC: "Public",
  REGISTERED_CUSTOMERS: "Registered Customers",
  MEMBERS: "Members Only",
  EMPLOYEES: "Employees Only",
  PARTNERS: "Partners Only",
  BUSINESS_CUSTOMERS: "Business Customers",
  CUSTOMER_SEGMENT: "Selected Customer Segments",
};
