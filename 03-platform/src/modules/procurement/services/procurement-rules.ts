/**
 * Purpose:
 * Pure business rules for BP-009 IP-01 procurement relationship.
 */

import {
  PARTICIPATING_STATUS_CODES,
  PROCUREMENT_PERMISSIONS,
  PROCUREMENT_STATUS_CODES,
  QUALIFICATION_STATUS_CODES,
  STATUS_CODES_REQUIRING_REASON,
  VALID_QUALIFICATION_OUTCOMES,
  type ProcurementStatusCode,
  type QualificationStatusCode,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { ProcurementActor } from "@/modules/procurement/types";

export function assertPermission(actor: ProcurementActor, permission: string) {
  if (!actor.permissions.includes(permission)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.UNAUTHORIZED, undefined, 403);
  }
}

export function hasPermission(actor: ProcurementActor, permission: string) {
  return actor.permissions.includes(permission);
}

export function assertView(actor: ProcurementActor) {
  assertPermission(actor, PROCUREMENT_PERMISSIONS.VIEW);
}

export function isProcurementStatus(value: string): value is ProcurementStatusCode {
  return Object.values(PROCUREMENT_STATUS_CODES).includes(
    value as ProcurementStatusCode
  );
}

export function isQualificationOutcome(value: string): value is QualificationStatusCode {
  return Object.values(QUALIFICATION_STATUS_CODES).includes(
    value as QualificationStatusCode
  );
}

export function displayStatusLabel(
  statusCode: string,
  isPreferred: boolean,
  statusName: string
) {
  if (isPreferred && statusCode === PROCUREMENT_STATUS_CODES.ACTIVE) {
    return "Preferred";
  }
  return statusName;
}

export function assertStatusChange(
  nextStatus: string,
  reason: string | undefined,
  isPreferred: boolean
): asserts nextStatus is ProcurementStatusCode {
  if (!isProcurementStatus(nextStatus)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_STATUS, undefined, 400, {
      field: "statusCode",
    });
  }
  if (
    STATUS_CODES_REQUIRING_REASON.includes(nextStatus) &&
    !reason?.trim()
  ) {
    throw new ProcurementError(
      PROCUREMENT_ERROR_CODES.STATUS_REASON_REQUIRED,
      undefined,
      400,
      { field: "reason" }
    );
  }
  if (
    nextStatus === PROCUREMENT_STATUS_CODES.BLACKLISTED &&
    isPreferred
  ) {
    throw new ProcurementError(
      PROCUREMENT_ERROR_CODES.INVALID_STATUS_TRANSITION,
      "A blacklisted supplier cannot be preferred. Clear preferred status first, or blacklist will clear it.",
      400
    );
  }
}

export function preferredAllowed(statusCode: string) {
  return statusCode === PROCUREMENT_STATUS_CODES.ACTIVE;
}

export function assertPreferredAllowed(statusCode: string, isPreferred: boolean) {
  if (isPreferred && !preferredAllowed(statusCode)) {
    throw new ProcurementError(
      PROCUREMENT_ERROR_CODES.INVALID_STATUS_TRANSITION,
      "Preferred can only be set when the supplier is active.",
      400
    );
  }
}

export function isParticipatingStatus(statusCode: string) {
  return PARTICIPATING_STATUS_CODES.includes(statusCode as ProcurementStatusCode);
}

export function isValidQualificationOutcome(outcome: string) {
  return VALID_QUALIFICATION_OUTCOMES.includes(outcome as QualificationStatusCode);
}

export function qualificationIsExpired(
  outcomeCode: string,
  expiryDate: string | null,
  asOf = new Date()
) {
  if (outcomeCode === QUALIFICATION_STATUS_CODES.EXPIRED) {
    return true;
  }
  if (!expiryDate) {
    return false;
  }
  return expiryDate < asOf.toISOString().slice(0, 10);
}

export function effectiveQualificationOutcome(
  outcomeCode: string,
  expiryDate: string | null,
  asOf = new Date()
): QualificationStatusCode {
  if (qualificationIsExpired(outcomeCode, expiryDate, asOf)) {
    return QUALIFICATION_STATUS_CODES.EXPIRED;
  }
  return isQualificationOutcome(outcomeCode)
    ? outcomeCode
    : QUALIFICATION_STATUS_CODES.PENDING;
}

export function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function assertNonEmptyCodes(
  codes: string[],
  errorCode:
    | typeof PROCUREMENT_ERROR_CODES.INVALID_CATEGORY
    | typeof PROCUREMENT_ERROR_CODES.INVALID_CAPABILITY,
  field: string
) {
  if (codes.length === 0) {
    throw new ProcurementError(errorCode, undefined, 400, { field });
  }
}
