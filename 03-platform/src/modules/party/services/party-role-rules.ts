/**
 * Purpose:
 * Pure Party Role business-rule helpers (no I/O).
 *
 * Implementation Package:
 * BP-002 / IP-002 – Party Roles
 */

import {
  PARTY_ROLE_STATUS_CODES,
  type PartyRoleStatusCode,
} from "@/modules/party/constants";

export function isPartyRoleStatusCode(
  value: string
): value is PartyRoleStatusCode {
  return (
    value === PARTY_ROLE_STATUS_CODES.ACTIVE ||
    value === PARTY_ROLE_STATUS_CODES.ENDED
  );
}

/**
 * WHAT: Decide whether a role assignment may become primary.
 * WHY: Only ACTIVE roles can be designated as the Primary Role.
 */
export function canSetPrimaryRole(statusCode: PartyRoleStatusCode): boolean {
  return statusCode === PARTY_ROLE_STATUS_CODES.ACTIVE;
}

/**
 * WHAT: Validate end/remove transition for an active role.
 * WHY: Historical roles are retained — ACTIVE → ENDED only.
 */
export function canEndPartyRole(statusCode: PartyRoleStatusCode): boolean {
  return statusCode === PARTY_ROLE_STATUS_CODES.ACTIVE;
}

/**
 * WHAT: Validate reactivation of a historical role.
 * WHY: ENDED → ACTIVE is allowed when no duplicate active role exists (service checks).
 */
export function canReactivatePartyRole(
  statusCode: PartyRoleStatusCode
): boolean {
  return statusCode === PARTY_ROLE_STATUS_CODES.ENDED;
}

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * WHAT: Determine if assigning roleTypeCode would duplicate an active role.
 * WHY: Smoke-testable pure rule for duplicate prevention.
 */
export function wouldDuplicateActiveRole(
  activeRoleTypeCodes: string[],
  roleTypeCode: string
): boolean {
  return activeRoleTypeCodes.includes(roleTypeCode);
}

/**
 * WHAT: Resolve which role becomes primary after assignment.
 * WHY: First active role is primary by default; explicit flag overrides.
 */
export function shouldAssignAsPrimary(
  existingActiveCount: number,
  requestedPrimary?: boolean
): boolean {
  if (requestedPrimary === true) {
    return true;
  }
  if (requestedPrimary === false) {
    return existingActiveCount === 0;
  }
  return existingActiveCount === 0;
}
