/**
 * Purpose:
 * Pure Party Address business-rule helpers (no I/O).
 *
 * Implementation Package:
 * BP-002 / IP-004 – Address Management
 */

import {
  ADDRESS_TYPE_CODES,
  PARTY_ADDRESS_STATUS_CODES,
  PARTY_TYPE_CODES,
  type PartyAddressStatusCode,
  type PartyTypeCode,
} from "@/modules/party/constants";

export function isPartyAddressStatusCode(
  value: string
): value is PartyAddressStatusCode {
  return (
    value === PARTY_ADDRESS_STATUS_CODES.ACTIVE ||
    value === PARTY_ADDRESS_STATUS_CODES.INACTIVE
  );
}

const ORGANIZATION_ONLY_ADDRESS_TYPES = new Set<string>([
  ADDRESS_TYPE_CODES.HEAD_OFFICE,
  ADDRESS_TYPE_CODES.BRANCH,
  ADDRESS_TYPE_CODES.OFFICE,
]);

/**
 * WHAT: Organization-only address types (Head Office, Branch, Office).
 */
export function isAddressTypeAllowedForPartyType(
  partyTypeCode: PartyTypeCode,
  addressTypeCode: string
): boolean {
  if (!ORGANIZATION_ONLY_ADDRESS_TYPES.has(addressTypeCode)) {
    return true;
  }
  return partyTypeCode === PARTY_TYPE_CODES.ORGANIZATION;
}

export function canBeDefaultAddress(
  statusCode: PartyAddressStatusCode,
  isDefault: boolean
): boolean {
  if (!isDefault) {
    return true;
  }
  return statusCode === PARTY_ADDRESS_STATUS_CODES.ACTIVE;
}

export function canDeactivateAddress(
  statusCode: PartyAddressStatusCode,
  isDefault: boolean
): boolean {
  if (isDefault) {
    return false;
  }
  return statusCode === PARTY_ADDRESS_STATUS_CODES.ACTIVE;
}

export function canReactivateAddress(
  statusCode: PartyAddressStatusCode
): boolean {
  return statusCode === PARTY_ADDRESS_STATUS_CODES.INACTIVE;
}
