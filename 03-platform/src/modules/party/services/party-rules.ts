/**
 * Purpose:
 * Pure Party Foundation business-rule helpers (no I/O).
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import {
  PARTY_STATUS_CODES,
  PARTY_TYPE_CODES,
  type PartyStatusCode,
  type PartyTypeCode,
} from "@/modules/party/constants";

/**
 * WHAT: Generate a system Party Number unique enough for tenant-scoped storage.
 * WHY: BR-IP001-004 — every Party receives a system-generated Party ID.
 */
export function generatePartyNumber(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `PTY-${y}${m}${d}-${suffix}`;
}

export function isPartyTypeCode(value: string): value is PartyTypeCode {
  return (
    value === PARTY_TYPE_CODES.INDIVIDUAL ||
    value === PARTY_TYPE_CODES.ORGANIZATION
  );
}

export function isPartyStatusCode(value: string): value is PartyStatusCode {
  return (
    value === PARTY_STATUS_CODES.ACTIVE ||
    value === PARTY_STATUS_CODES.SUSPENDED ||
    value === PARTY_STATUS_CODES.ARCHIVED
  );
}

/**
 * WHAT: Default status for new Parties when approval workflow is not enabled.
 * WHY: BR-IP001-005 — Party Status defaults to Active unless workflow is enabled.
 */
export function resolveDefaultPartyStatus(
  approvalWorkflowEnabled = false
): PartyStatusCode {
  return approvalWorkflowEnabled
    ? PARTY_STATUS_CODES.ACTIVE
    : PARTY_STATUS_CODES.ACTIVE;
}

/**
 * WHAT: Validate allowed lifecycle transitions for Activate / Suspend / Archive.
 * WHY: Keep status rules in one place for services and smoke tests.
 */
export function canTransitionPartyStatus(
  current: PartyStatusCode,
  next: PartyStatusCode
): boolean {
  if (current === next) {
    return true;
  }

  if (current === PARTY_STATUS_CODES.ARCHIVED) {
    return false;
  }

  if (next === PARTY_STATUS_CODES.ACTIVE) {
    return (
      current === PARTY_STATUS_CODES.SUSPENDED ||
      current === PARTY_STATUS_CODES.ACTIVE
    );
  }

  if (next === PARTY_STATUS_CODES.SUSPENDED) {
    return current === PARTY_STATUS_CODES.ACTIVE;
  }

  if (next === PARTY_STATUS_CODES.ARCHIVED) {
    return (
      current === PARTY_STATUS_CODES.ACTIVE ||
      current === PARTY_STATUS_CODES.SUSPENDED
    );
  }

  return false;
}

export function assertPartyTypeImmutable(
  existingType: string,
  requestedType: string | undefined
): boolean {
  if (!requestedType) {
    return true;
  }
  return existingType === requestedType;
}
