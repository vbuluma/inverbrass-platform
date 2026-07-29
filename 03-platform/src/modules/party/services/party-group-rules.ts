/**
 * Purpose:
 * Pure Party Group business-rule helpers (no I/O).
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

import {
  PARTY_GROUP_MEMBER_STATUS_CODES,
  PARTY_GROUP_STATUS_CODES,
  type PartyGroupMemberStatusCode,
  type PartyGroupStatusCode,
} from "@/modules/party/constants";

export function isPartyGroupStatusCode(
  value: string
): value is PartyGroupStatusCode {
  return (
    value === PARTY_GROUP_STATUS_CODES.ACTIVE ||
    value === PARTY_GROUP_STATUS_CODES.INACTIVE
  );
}

export function isPartyGroupMemberStatusCode(
  value: string
): value is PartyGroupMemberStatusCode {
  return (
    value === PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE ||
    value === PARTY_GROUP_MEMBER_STATUS_CODES.EXITED
  );
}

export function canDeactivateGroup(statusCode: PartyGroupStatusCode): boolean {
  return statusCode === PARTY_GROUP_STATUS_CODES.ACTIVE;
}

export function canReactivateGroup(statusCode: PartyGroupStatusCode): boolean {
  return statusCode === PARTY_GROUP_STATUS_CODES.INACTIVE;
}

export function canExitMembership(
  statusCode: PartyGroupMemberStatusCode
): boolean {
  return statusCode === PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE;
}

export function canRejoinMembership(
  statusCode: PartyGroupMemberStatusCode
): boolean {
  return statusCode === PARTY_GROUP_MEMBER_STATUS_CODES.EXITED;
}

export function isActiveGroupMembership(
  partyGroupId: string,
  partyId: string,
  existing: {
    partyGroupId: string;
    partyId: string;
    statusCode: string;
  }
): boolean {
  if (existing.statusCode !== PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE) {
    return false;
  }

  return (
    existing.partyGroupId.trim().toLowerCase() ===
      partyGroupId.trim().toLowerCase() &&
    existing.partyId.trim().toLowerCase() === partyId.trim().toLowerCase()
  );
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeGroupCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}
