/**
 * Purpose:
 * Account & Contact Management constants.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
 */

export const ACCOUNT_TYPE_CODES = {
  ENTERPRISE: "ENTERPRISE",
  SME: "SME",
  HOUSEHOLD: "HOUSEHOLD",
  GOVERNMENT: "GOVERNMENT",
  PARTNER: "PARTNER",
  OTHER: "OTHER",
} as const;

export const ACCOUNT_STATUS_CODES = {
  PROSPECT: "PROSPECT",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  CLOSED: "CLOSED",
} as const;

export type AccountStatusCode =
  (typeof ACCOUNT_STATUS_CODES)[keyof typeof ACCOUNT_STATUS_CODES];

export const CRM_CONTACT_ROLE_CODES = {
  DECISION_MAKER: "DECISION_MAKER",
  INFLUENCER: "INFLUENCER",
  USER: "USER",
  BILLING: "BILLING",
  TECHNICAL: "TECHNICAL",
  OTHER: "OTHER",
} as const;

export const INFLUENCE_LEVEL_CODES = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;

export const ACCOUNT_NUMBER_PREFIX = "ACC";

export const ACCOUNT_DEFAULT_PAGE_SIZE = 25;

export const ACCOUNT_MAX_HIERARCHY_DEPTH = 5;
