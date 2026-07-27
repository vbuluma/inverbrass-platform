/**
 * Purpose:
 * Pure Party Contact business-rule helpers (no I/O).
 *
 * Implementation Package:
 * BP-002 / IP-003 – Contacts & Communication
 */

import {
  CONTACT_TYPE_CODES,
  PARTY_CONTACT_STATUS_CODES,
  PARTY_TYPE_CODES,
  type PartyContactStatusCode,
  type PartyTypeCode,
} from "@/modules/party/constants";

export function isPartyContactStatusCode(
  value: string
): value is PartyContactStatusCode {
  return (
    value === PARTY_CONTACT_STATUS_CODES.ACTIVE ||
    value === PARTY_CONTACT_STATUS_CODES.INACTIVE
  );
}

/**
 * WHAT: Website contacts are allowed for Organizations only (BR-008).
 */
export function isWebsiteAllowedForPartyType(
  partyTypeCode: PartyTypeCode,
  contactTypeCode: string
): boolean {
  if (contactTypeCode !== CONTACT_TYPE_CODES.WEBSITE) {
    return true;
  }
  return partyTypeCode === PARTY_TYPE_CODES.ORGANIZATION;
}

/**
 * WHAT: Preferred contacts must remain Active (BR-007).
 */
export function canBePreferred(
  statusCode: PartyContactStatusCode,
  isPreferred: boolean
): boolean {
  if (!isPreferred) {
    return true;
  }
  return statusCode === PARTY_CONTACT_STATUS_CODES.ACTIVE;
}

export function canDeactivateContact(
  statusCode: PartyContactStatusCode,
  isPreferred: boolean
): boolean {
  if (isPreferred) {
    return false;
  }
  return statusCode === PARTY_CONTACT_STATUS_CODES.ACTIVE;
}

export function canReactivateContact(
  statusCode: PartyContactStatusCode
): boolean {
  return statusCode === PARTY_CONTACT_STATUS_CODES.INACTIVE;
}

/**
 * WHAT: Detect whether setting preferred would violate one-preferred-per-type.
 */
export function wouldDuplicatePreferredForType(
  existingPreferredContactId: string | null,
  targetContactId: string | null
): boolean {
  if (!existingPreferredContactId) {
    return false;
  }
  if (!targetContactId) {
    return true;
  }
  return existingPreferredContactId !== targetContactId;
}
