/**
 * Purpose:
 * Industry Experience bundle terminology (ENG-003k presentation).
 *
 * Implementation Package:
 * BP-003 / IP-006 – Bundles & Packages Engine
 */

export const INDUSTRY_BUNDLE_LABELS: Record<string, string> = {
  COMMERCE: "Bundles",
  FINANCIAL: "Product Packages",
  HEALTHCARE: "Care Packages",
  PROPERTY: "Rental Packages",
  EDUCATION: "Programmes",
  HOSPITALITY: "Offers",
  AGRICULTURE: "Input Packages",
  TRANSPORT: "Packages",
  MANUFACTURING: "Packages",
  PROFESSIONAL: "Packages",
};

export const DEFAULT_BUNDLE_LABEL = "Bundles";

export function resolveBundleLabel(
  industryCode: string | null | undefined
): string {
  if (!industryCode) {
    return DEFAULT_BUNDLE_LABEL;
  }
  return INDUSTRY_BUNDLE_LABELS[industryCode] ?? DEFAULT_BUNDLE_LABEL;
}
