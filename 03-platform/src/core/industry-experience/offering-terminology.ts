/**
 * Purpose:
 * Internal Offering Engine terminology (ENG-003f foundation / ENG-003k presentation).
 *
 * Architecture:
 * - Developers use "Offering" — the generic master record for anything a business provides.
 * - Platform navigation always shows "Offerings" (see platform-terminology.ts).
 * - Workspace labels are industry-native (Medical Services, Rental Units, Products, …).
 * - Database tables retain `product_*` names (frozen BP-003 IP-001 schema).
 */

import { PLATFORM_NAV_OFFERING_LABEL } from "@/core/industry-experience/platform-terminology";

/** Internal architecture term — alias for the product master entity. */
export type OfferingMasterRecord = {
  offeringId: string;
  offeringCode: string;
  offeringName: string;
};

/**
 * Industry-native workspace labels for master offering records.
 * NOT used for platform sidebar navigation.
 */
export const OFFERING_WORKSPACE_LABELS: Record<string, string> = {
  FINANCIAL: "Loan Products",
  HEALTHCARE: "Medical Services",
  EDUCATION: "Programmes",
  PROPERTY: "Rental Units",
  HOSPITALITY: "Room Products",
  COMMERCE: "Products",
  AGRICULTURE: "Agri Products",
  TRANSPORT: "Fleet Products",
  MANUFACTURING: "Products",
  PROFESSIONAL: "Services",
  GOVERNMENT: "Services",
  SALON: "Services",
  NGO: "Programmes",
  NON_PROFIT: "Programmes",
};

export const DEFAULT_OFFERING_WORKSPACE_LABEL = "Products";

/** @deprecated Use OFFERING_WORKSPACE_LABELS — kept for catalog merge registry compatibility */
export const OFFERING_CATALOGUE_NAV_LABELS = OFFERING_WORKSPACE_LABELS;

export const DEFAULT_OFFERING_CATALOGUE_LABEL = DEFAULT_OFFERING_WORKSPACE_LABEL;

/** Stable platform navigation label — always "Offerings". */
export function resolveOfferingNavLabel(): string {
  return PLATFORM_NAV_OFFERING_LABEL;
}

/** Industry workspace label for master offering records. */
export function resolveOfferingWorkspaceLabel(
  industryCode: string | null | undefined
): string {
  if (!industryCode) {
    return DEFAULT_OFFERING_WORKSPACE_LABEL;
  }
  return (
    OFFERING_WORKSPACE_LABELS[industryCode] ?? DEFAULT_OFFERING_WORKSPACE_LABEL
  );
}

/** @deprecated Use resolveOfferingNavLabel for navigation; resolveOfferingWorkspaceLabel for workspace */
export function resolveOfferingCatalogueNavLabel(
  industryCode: string | null | undefined
): string {
  return resolveOfferingWorkspaceLabel(industryCode);
}

export function resolveOfferingCataloguePageTitle(
  industryCode: string | null | undefined
): string {
  return `${PLATFORM_NAV_OFFERING_LABEL} — ${resolveOfferingWorkspaceLabel(industryCode)}`;
}

export function resolveOfferingHubTitle(): string {
  return PLATFORM_NAV_OFFERING_LABEL;
}
