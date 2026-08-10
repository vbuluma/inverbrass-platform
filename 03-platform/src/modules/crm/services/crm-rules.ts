/**
 * Purpose:
 * Pure CRM Foundation business-rule helpers (no I/O).
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import {
  CRM_STATUS_CODES,
  CUSTOMER_NUMBER_PREFIX,
  type CrmRecordSourceCode,
  type CrmStatusCode,
} from "@/modules/crm/constants";

export function resolveDefaultCrmStatus(): CrmStatusCode {
  return CRM_STATUS_CODES.PROSPECT;
}

export function isCrmStatusCode(value: string): value is CrmStatusCode {
  return Object.values(CRM_STATUS_CODES).includes(value as CrmStatusCode);
}

export function isCrmRecordSourceCode(
  value: string
): value is CrmRecordSourceCode {
  return (
    value === "MIGRATED" ||
    value === "PLATFORM_CREATED" ||
    value === "API"
  );
}

export function canTransitionCrmStatus(
  current: CrmStatusCode,
  next: CrmStatusCode
): boolean {
  if (current === next) {
    return true;
  }

  if (current === CRM_STATUS_CODES.ARCHIVED) {
    return false;
  }

  if (next === CRM_STATUS_CODES.PROSPECT) {
    return current === CRM_STATUS_CODES.PROSPECT;
  }

  if (next === CRM_STATUS_CODES.LEAD) {
    return (
      current === CRM_STATUS_CODES.PROSPECT ||
      current === CRM_STATUS_CODES.LEAD
    );
  }

  if (next === CRM_STATUS_CODES.ACTIVE) {
    return (
      current === CRM_STATUS_CODES.PROSPECT ||
      current === CRM_STATUS_CODES.LEAD ||
      current === CRM_STATUS_CODES.DORMANT ||
      current === CRM_STATUS_CODES.SUSPENDED
    );
  }

  if (next === CRM_STATUS_CODES.DORMANT) {
    return current === CRM_STATUS_CODES.ACTIVE;
  }

  if (next === CRM_STATUS_CODES.SUSPENDED) {
    return (
      current === CRM_STATUS_CODES.ACTIVE ||
      current === CRM_STATUS_CODES.DORMANT
    );
  }

  if (next === CRM_STATUS_CODES.CLOSED) {
    return (
      current === CRM_STATUS_CODES.ACTIVE ||
      current === CRM_STATUS_CODES.DORMANT ||
      current === CRM_STATUS_CODES.SUSPENDED
    );
  }

  if (next === CRM_STATUS_CODES.ARCHIVED) {
    return current === CRM_STATUS_CODES.CLOSED;
  }

  return false;
}

export function isCrmRecordEditable(statusCode: CrmStatusCode): boolean {
  return statusCode !== CRM_STATUS_CODES.ARCHIVED;
}

export function formatCustomerNumber(sequence: number): string {
  return `${CUSTOMER_NUMBER_PREFIX}-${String(sequence).padStart(6, "0")}`;
}

export function inferCrmTypeFromPartyType(
  partyTypeCode: string
): "INDIVIDUAL" | "BUSINESS" {
  return partyTypeCode === "INDIVIDUAL" ? "INDIVIDUAL" : "BUSINESS";
}

export function resolveCustomer360LayoutProfile(
  partyTypeCode: string
): "individual" | "entity" {
  return partyTypeCode === "INDIVIDUAL" ? "individual" : "entity";
}
