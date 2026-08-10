/**
 * Purpose:
 * Lead lifecycle business rules.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

import {
  LEAD_ACTIVE_STATUS_CODES,
  LEAD_NUMBER_PREFIX,
  LEAD_READ_ONLY_STATUS_CODES,
  LEAD_STATUS_CODES,
  type LeadStatusCode,
} from "@/modules/crm/lead/constants";

const LEAD_STATUS_TRANSITIONS: Record<LeadStatusCode, LeadStatusCode[]> = {
  [LEAD_STATUS_CODES.NEW]: [
    LEAD_STATUS_CODES.CONTACTED,
    LEAD_STATUS_CODES.UNQUALIFIED,
  ],
  [LEAD_STATUS_CODES.CONTACTED]: [
    LEAD_STATUS_CODES.QUALIFIED,
    LEAD_STATUS_CODES.UNQUALIFIED,
  ],
  [LEAD_STATUS_CODES.QUALIFIED]: [
    LEAD_STATUS_CODES.CONVERTED,
    LEAD_STATUS_CODES.UNQUALIFIED,
  ],
  [LEAD_STATUS_CODES.UNQUALIFIED]: [LEAD_STATUS_CODES.RECYCLED],
  [LEAD_STATUS_CODES.RECYCLED]: [
    LEAD_STATUS_CODES.NEW,
    LEAD_STATUS_CODES.CONTACTED,
  ],
  [LEAD_STATUS_CODES.CONVERTED]: [],
};

export function isLeadStatusCode(value: string): value is LeadStatusCode {
  return Object.values(LEAD_STATUS_CODES).includes(value as LeadStatusCode);
}

export function canTransitionLeadStatus(
  fromStatus: LeadStatusCode | string,
  toStatus: LeadStatusCode | string
): boolean {
  if (!isLeadStatusCode(fromStatus) || !isLeadStatusCode(toStatus)) {
    return false;
  }

  return LEAD_STATUS_TRANSITIONS[fromStatus].includes(toStatus);
}

export function isLeadEditable(statusCode: LeadStatusCode | string): boolean {
  return !LEAD_READ_ONLY_STATUS_CODES.includes(statusCode as LeadStatusCode);
}

export function isLeadActive(statusCode: LeadStatusCode | string): boolean {
  return LEAD_ACTIVE_STATUS_CODES.includes(statusCode as LeadStatusCode);
}

export function formatLeadNumber(sequence: number): string {
  return `${LEAD_NUMBER_PREFIX}-${String(sequence).padStart(6, "0")}`;
}

export function resolveLeadStatusTone(
  statusCode: LeadStatusCode | string
): "default" | "warning" | "success" | "danger" {
  switch (statusCode) {
    case LEAD_STATUS_CODES.QUALIFIED:
      return "success";
    case LEAD_STATUS_CODES.UNQUALIFIED:
      return "danger";
    case LEAD_STATUS_CODES.CONTACTED:
    case LEAD_STATUS_CODES.RECYCLED:
      return "warning";
    default:
      return "default";
  }
}
