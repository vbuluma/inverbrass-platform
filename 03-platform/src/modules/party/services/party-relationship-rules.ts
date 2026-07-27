/**
 * Purpose:
 * Pure Party Relationship business-rule helpers (no I/O).
 *
 * Implementation Package:
 * BP-002 / IP-005 – Party Relationships
 */

import {
  PARTY_RELATIONSHIP_STATUS_CODES,
  type PartyRelationshipStatusCode,
} from "@/modules/party/constants";

export function isPartyRelationshipStatusCode(
  value: string
): value is PartyRelationshipStatusCode {
  return (
    value === PARTY_RELATIONSHIP_STATUS_CODES.ACTIVE ||
    value === PARTY_RELATIONSHIP_STATUS_CODES.INACTIVE
  );
}

export function isSelfRelationship(
  fromPartyId: string,
  toPartyId: string
): boolean {
  return fromPartyId.trim().toLowerCase() === toPartyId.trim().toLowerCase();
}

/**
 * WHAT: True when existing row is an active same-type link between partyIdA and partyIdB.
 * WHY: Spec — no duplicate active same-type between the same parties (either direction).
 */
export function isActiveRelationshipBetweenParties(
  partyIdA: string,
  partyIdB: string,
  relationshipTypeCode: string,
  existing: {
    fromPartyId: string;
    toPartyId: string;
    relationshipTypeCode: string;
    statusCode: string;
  }
): boolean {
  if (existing.statusCode !== PARTY_RELATIONSHIP_STATUS_CODES.ACTIVE) {
    return false;
  }

  const normalizedType = relationshipTypeCode.trim().toUpperCase();
  if (existing.relationshipTypeCode.trim().toUpperCase() !== normalizedType) {
    return false;
  }

  const a = partyIdA.trim().toLowerCase();
  const b = partyIdB.trim().toLowerCase();
  const from = existing.fromPartyId.trim().toLowerCase();
  const to = existing.toPartyId.trim().toLowerCase();

  return (from === a && to === b) || (from === b && to === a);
}

export function canDeactivateRelationship(
  statusCode: PartyRelationshipStatusCode
): boolean {
  return statusCode === PARTY_RELATIONSHIP_STATUS_CODES.ACTIVE;
}

export function canReactivateRelationship(
  statusCode: PartyRelationshipStatusCode
): boolean {
  return statusCode === PARTY_RELATIONSHIP_STATUS_CODES.INACTIVE;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
