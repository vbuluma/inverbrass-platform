/**
 * Purpose:
 * Industry Experience variant terminology (ENG-003k presentation).
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

export const INDUSTRY_VARIANT_LABELS: Record<string, string> = {
  COMMERCE: "SKUs",
  FINANCIAL: "Product Options",
  HEALTHCARE: "Treatment Options",
  PROPERTY: "Unit Types",
  EDUCATION: "Intake Options",
  HOSPITALITY: "Variants",
  AGRICULTURE: "Variants",
  TRANSPORT: "Variants",
  MANUFACTURING: "Variants",
  PROFESSIONAL: "Service Options",
  SALON: "Service Options",
};

export const DEFAULT_VARIANT_LABEL = "Variants";

export function resolveVariantLabel(
  industryCode: string | null | undefined
): string {
  if (!industryCode) {
    return DEFAULT_VARIANT_LABEL;
  }
  return INDUSTRY_VARIANT_LABELS[industryCode] ?? DEFAULT_VARIANT_LABEL;
}

export function resolveVariantLabelPlural(
  industryCode: string | null | undefined
): string {
  return resolveVariantLabel(industryCode);
}
