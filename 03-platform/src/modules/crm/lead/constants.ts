/**
 * Purpose:
 * Lead Management constants.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

export const LEAD_STATUS_CODES = {
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  QUALIFIED: "QUALIFIED",
  UNQUALIFIED: "UNQUALIFIED",
  CONVERTED: "CONVERTED",
  RECYCLED: "RECYCLED",
} as const;

export type LeadStatusCode =
  (typeof LEAD_STATUS_CODES)[keyof typeof LEAD_STATUS_CODES];

export const LEAD_CHANNEL_CODES = {
  PHONE: "PHONE",
  EMAIL: "EMAIL",
  IN_PERSON: "IN_PERSON",
  SOCIAL: "SOCIAL",
  EVENT: "EVENT",
  OTHER: "OTHER",
} as const;

export const LEAD_NUMBER_PREFIX = "LED";

export const LEAD_DEFAULT_PAGE_SIZE = 25;

/** Active pipeline statuses shown on dashboards and Customer 360 widget. */
export const LEAD_ACTIVE_STATUS_CODES: LeadStatusCode[] = [
  LEAD_STATUS_CODES.NEW,
  LEAD_STATUS_CODES.CONTACTED,
  LEAD_STATUS_CODES.QUALIFIED,
  LEAD_STATUS_CODES.RECYCLED,
];

export const LEAD_READ_ONLY_STATUS_CODES: LeadStatusCode[] = [
  LEAD_STATUS_CODES.CONVERTED,
];
