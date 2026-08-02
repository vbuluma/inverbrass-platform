/**
 * Purpose:
 * Industry Experience digital catalogue presentation labels (ENG-003k).
 *
 * Implementation Package:
 * BP-003 / IP-007 – Digital Catalogue Engine
 */

export const INDUSTRY_DIGITAL_CATALOGUE_LABELS: Record<string, string> = {
  COMMERCE: "Catalogue",
  FINANCIAL: "Products",
  HEALTHCARE: "Services",
  PROPERTY: "Listings",
  EDUCATION: "Offerings",
  HOSPITALITY: "Offers",
  AGRICULTURE: "Catalogue",
  TRANSPORT: "Catalogue",
  MANUFACTURING: "Catalogue",
  PROFESSIONAL: "Services",
};

export const DEFAULT_DIGITAL_CATALOGUE_LABEL = "Catalogue";

export function resolveDigitalCatalogueLabel(
  industryCode: string | null | undefined
): string {
  if (!industryCode) {
    return DEFAULT_DIGITAL_CATALOGUE_LABEL;
  }
  return INDUSTRY_DIGITAL_CATALOGUE_LABELS[industryCode] ?? DEFAULT_DIGITAL_CATALOGUE_LABEL;
}
