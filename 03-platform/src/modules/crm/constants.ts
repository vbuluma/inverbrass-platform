/**
 * Purpose:
 * CRM Foundation constants.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

export const CRM_TYPE_CODES = {
  INDIVIDUAL: "INDIVIDUAL",
  BUSINESS: "BUSINESS",
  SME: "SME",
  CORPORATE: "CORPORATE",
  GOVERNMENT: "GOVERNMENT",
  NGO: "NGO",
} as const;

export type CrmTypeCode = (typeof CRM_TYPE_CODES)[keyof typeof CRM_TYPE_CODES];

export const CRM_STATUS_CODES = {
  PROSPECT: "PROSPECT",
  LEAD: "LEAD",
  ACTIVE: "ACTIVE",
  DORMANT: "DORMANT",
  SUSPENDED: "SUSPENDED",
  CLOSED: "CLOSED",
  ARCHIVED: "ARCHIVED",
} as const;

export type CrmStatusCode =
  (typeof CRM_STATUS_CODES)[keyof typeof CRM_STATUS_CODES];

export const CRM_RECORD_SOURCE_CODES = {
  MIGRATED: "MIGRATED",
  PLATFORM_CREATED: "PLATFORM_CREATED",
  API: "API",
} as const;

export type CrmRecordSourceCode =
  (typeof CRM_RECORD_SOURCE_CODES)[keyof typeof CRM_RECORD_SOURCE_CODES];

export const CRM_SOURCE_CODES = {
  REFERRAL: "REFERRAL",
  WALK_IN: "WALK_IN",
  WEB: "WEB",
  CAMPAIGN: "CAMPAIGN",
  PARTNER: "PARTNER",
  OTHER: "OTHER",
} as const;

export const CRM_DEFAULT_PAGE_SIZE = 25;

export const CUSTOMER_NUMBER_PREFIX = "CUS";

/** Customer Profile workspace tabs — Customer 360 is the default landing tab. */
export const CRM_WORKSPACE_TABS = [
  { id: "customer-360", label: "Customer 360", available: true, futureIp: null },
  {
    id: "accounts",
    label: "Accounts",
    available: true,
    futureIp: "IP-04",
  },
  {
    id: "opportunities",
    label: "Opportunities",
    available: true,
    futureIp: "IP-03",
  },
  { id: "activities", label: "Activities", available: false, futureIp: "IP-05" },
  { id: "visits", label: "Visits", available: false, futureIp: "IP-07" },
  {
    id: "communications",
    label: "Communications",
    available: false,
    futureIp: "IP-08",
  },
  { id: "cases", label: "Cases", available: false, futureIp: "IP-09" },
  {
    id: "quotations",
    label: "Quotations",
    available: false,
    futureIp: "IP-10",
  },
  { id: "campaigns", label: "Campaigns", available: false, futureIp: "IP-11" },
  { id: "documents", label: "Documents", available: true, futureIp: "BP-002" },
  {
    id: "relationships",
    label: "Relationships",
    available: true,
    futureIp: "BP-002",
  },
  { id: "timeline", label: "Timeline", available: true, futureIp: null },
  { id: "analytics", label: "Analytics", available: false, futureIp: "IP-12" },
  { id: "settings", label: "Settings", available: false, futureIp: "IP-13" },
] as const;

export const CRM_DEFAULT_TAB = "customer-360" as const;

export const FUTURE_TAB_MESSAGE =
  "This capability will be delivered in a future implementation package.";

export const PARTY_TYPE_CODES = {
  INDIVIDUAL: "INDIVIDUAL",
  ORGANIZATION: "ORGANIZATION",
} as const;

export type PartyTypeCodeForCrm =
  (typeof PARTY_TYPE_CODES)[keyof typeof PARTY_TYPE_CODES];
