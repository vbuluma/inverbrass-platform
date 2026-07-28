/**
 * Purpose:
 * Pure Organizational Unit business-rule helpers (no I/O).
 *
 * Engine:
 * ENG-003c – Organization Structure Engine
 */

import {
  ADDRESS_TYPE_CODES,
  ORGANIZATIONAL_UNIT_STATUS_CODES,
  PARTY_TYPE_CODES,
  type AddressTypeCode,
  type OrganizationalUnitStatusCode,
  type PartyTypeCode,
} from "@/modules/party/constants";

export const UNIT_PHYSICAL_ADDRESS_TYPE_CODES = [
  ADDRESS_TYPE_CODES.PHYSICAL,
  ADDRESS_TYPE_CODES.BRANCH,
  ADDRESS_TYPE_CODES.OFFICE,
  ADDRESS_TYPE_CODES.HEAD_OFFICE,
] as const satisfies readonly AddressTypeCode[];

export function isUnitPhysicalAddressType(addressTypeCode: string): boolean {
  return (UNIT_PHYSICAL_ADDRESS_TYPE_CODES as readonly string[]).includes(
    addressTypeCode
  );
}

export function defaultPhysicalAddressTypeForUnit(isHeadOffice: boolean): AddressTypeCode {
  return isHeadOffice ? ADDRESS_TYPE_CODES.HEAD_OFFICE : ADDRESS_TYPE_CODES.BRANCH;
}

export function isOrganizationalUnitStatusCode(
  value: string
): value is OrganizationalUnitStatusCode {
  return (
    value === ORGANIZATIONAL_UNIT_STATUS_CODES.ACTIVE ||
    value === ORGANIZATIONAL_UNIT_STATUS_CODES.INACTIVE
  );
}

export function canOwnOrganizationalUnits(partyTypeCode: PartyTypeCode): boolean {
  return partyTypeCode === PARTY_TYPE_CODES.ORGANIZATION;
}

/** @deprecated Use canOwnOrganizationalUnits */
export const canOwnBranches = canOwnOrganizationalUnits;

export function normalizeUnitCode(code: string): string {
  return code.trim().toUpperCase();
}

/** @deprecated Use normalizeUnitCode */
export const normalizeBranchCode = normalizeUnitCode;

export function canDeactivateOrganizationalUnit(
  statusCode: OrganizationalUnitStatusCode,
  isHeadOffice: boolean
): boolean {
  if (statusCode !== ORGANIZATIONAL_UNIT_STATUS_CODES.ACTIVE) {
    return false;
  }
  return !isHeadOffice;
}

export function canReactivateOrganizationalUnit(
  statusCode: OrganizationalUnitStatusCode
): boolean {
  return statusCode === ORGANIZATIONAL_UNIT_STATUS_CODES.INACTIVE;
}

export function canSetHeadOffice(
  statusCode: OrganizationalUnitStatusCode
): boolean {
  return statusCode === ORGANIZATIONAL_UNIT_STATUS_CODES.ACTIVE;
}

export function isValidParentOrganizationalUnit(
  unitId: string,
  parentOrganizationalUnitId: string | null | undefined
): boolean {
  if (!parentOrganizationalUnitId) {
    return true;
  }
  return (
    parentOrganizationalUnitId.trim().toLowerCase() !==
    unitId.trim().toLowerCase()
  );
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatLocationDisplay(input: {
  countryCode: string | null;
  latitude: string | null;
  longitude: string | null;
  partyAddressLabel: string | null;
}): string {
  const parts: string[] = [];
  if (input.partyAddressLabel) {
    parts.push(input.partyAddressLabel);
  }
  if (input.countryCode) {
    parts.push(input.countryCode.toUpperCase());
  }
  if (input.latitude && input.longitude) {
    parts.push(`${input.latitude}, ${input.longitude}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "—";
}
