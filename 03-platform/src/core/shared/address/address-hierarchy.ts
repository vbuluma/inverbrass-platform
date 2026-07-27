/**
 * Purpose:
 * EDS-009 address field labels — generic hierarchy until Localization (ENG-003b).
 *
 * Enterprise Data Standard:
 * EDS-009 – Address Standardization via configurable administrative hierarchy.
 */

export type AddressFieldLabels = {
  stateProvince: string;
  countyDistrict: string;
  cityTown: string;
  wardLocality: string;
};

const DEFAULT_LABELS: AddressFieldLabels = {
  stateProvince: "State / Province",
  countyDistrict: "County / District",
  cityTown: "City / Town",
  wardLocality: "Ward / Locality",
};

/**
 * WHAT: Resolve address form labels for a country.
 * WHY: EDS-009 — Localization Engine will supply country-specific hierarchy later.
 */
export function getAddressFieldLabels(countryCode: string): AddressFieldLabels {
  void countryCode;
  return DEFAULT_LABELS;
}

/**
 * WHAT: Format county/state for list display.
 */
export function formatCountyOrState(
  countyDistrict: string | null,
  stateProvince: string | null
): string {
  const parts = [countyDistrict, stateProvince].filter(
    (value) => value && value.trim().length > 0
  );
  return parts.length > 0 ? parts.join(" · ") : "—";
}
