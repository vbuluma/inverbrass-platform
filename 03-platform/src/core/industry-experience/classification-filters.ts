/**
 * Purpose:
 * Industry Experience visibility for Catalogue Structure nodes (ENG-003k).
 *
 * Null industry_code on a node = visible to all industries.
 */

/** Suggested default icons per industry for UI hints (optional on nodes). */
export const INDUSTRY_CATALOGUE_ICONS: Record<string, string> = {
  PROPERTY: "🏠",
  FINANCIAL: "💰",
  HEALTHCARE: "🏥",
  EDUCATION: "🎓",
  AGRICULTURE: "🌾",
  COMMERCE: "🛍️",
  HOSPITALITY: "🏨",
  TRANSPORT: "🚚",
  MANUFACTURING: "🏭",
  PROFESSIONAL: "💼",
};

export function filterClassificationsForIndustry<
  T extends { industryCode: string | null },
>(items: T[], industryCode: string | null | undefined): T[] {
  if (!industryCode) {
    return items;
  }

  return items.filter(
    (item) => !item.industryCode || item.industryCode === industryCode
  );
}

export function isClassificationVisibleForIndustry(
  nodeIndustryCode: string | null | undefined,
  businessIndustryCode: string | null | undefined
): boolean {
  if (!nodeIndustryCode) {
    return true;
  }
  if (!businessIndustryCode) {
    return true;
  }
  return nodeIndustryCode === businessIndustryCode;
}
