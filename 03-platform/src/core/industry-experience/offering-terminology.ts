/**
 * Purpose:
 * Internal Offering Engine terminology (ENG-003f foundation / ENG-003k presentation).
 *
 * Architecture:
 * - Developers use "Offering" — the generic master record for anything a business provides.
 * - Users see industry-native labels ("Loan Products", "Medical Services", "Courses").
 * - Database tables retain `product_*` names (frozen BP-003 IP-001 schema).
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation (Offering Engine)
 */

/** Internal architecture term — alias for the product master entity. */
export type OfferingMasterRecord = {
  /** Persisted as product.id */
  offeringId: string;
  /** Persisted as product_code */
  offeringCode: string;
  /** Persisted as product_name */
  offeringName: string;
};

/**
 * Industry-native catalogue labels shown in navigation and page titles.
 * ENG-003k will eventually load these from Industry Experience Profiles.
 */
export const OFFERING_CATALOGUE_NAV_LABELS: Record<string, string> = {
  FINANCIAL: "Loan Products",
  HEALTHCARE: "Medical Services",
  EDUCATION: "Courses",
  PROPERTY: "Rental Units",
  HOSPITALITY: "Room Products",
  COMMERCE: "Products",
  AGRICULTURE: "Agri Products",
  TRANSPORT: "Fleet Products",
  MANUFACTURING: "Products",
  PROFESSIONAL: "Services",
  GOVERNMENT: "Services",
  NGO: "Programmes",
};

export const DEFAULT_OFFERING_CATALOGUE_LABEL = "Products";

export function resolveOfferingCatalogueNavLabel(
  industryCode: string | null | undefined
): string {
  if (!industryCode) {
    return DEFAULT_OFFERING_CATALOGUE_LABEL;
  }
  return (
    OFFERING_CATALOGUE_NAV_LABELS[industryCode] ??
    DEFAULT_OFFERING_CATALOGUE_LABEL
  );
}

export function resolveOfferingCataloguePageTitle(
  industryCode: string | null | undefined
): string {
  return `${resolveOfferingCatalogueNavLabel(industryCode)} Catalogue`;
}
