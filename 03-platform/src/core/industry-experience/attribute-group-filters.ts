/**
 * Purpose:
 * Industry Experience attribute group visibility — static profile until ENG-003k metadata ships.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

/** Industry code → allowed attribute group codes for dashboard filters. */
export const INDUSTRY_ATTRIBUTE_GROUP_PROFILES: Record<string, readonly string[]> = {
  PROPERTY: [
    "PROPERTY_DETAILS",
    "FACILITIES",
    "UTILITIES",
    "DIMENSIONS",
    "SPECIFICATIONS",
  ],
  FINANCIAL: [
    "LOAN_DETAILS",
    "PRICING",
    "POLICY",
    "COVERAGE",
    "CLAIMS",
  ],
  HEALTHCARE: [
    "CLINICAL",
    "CONSULTATION",
    "MEDICATION",
    "INSURANCE",
  ],
  COMMERCE: [
    "INVENTORY",
    "SPECIFICATIONS",
    "PRICING",
    "TAX",
  ],
};

export function filterAttributeGroupsForIndustry<T extends { code: string }>(
  groups: T[],
  industryCode: string | null | undefined
): T[] {
  if (!industryCode) {
    return groups;
  }

  const allowed = INDUSTRY_ATTRIBUTE_GROUP_PROFILES[industryCode];
  if (!allowed || allowed.length === 0) {
    return groups;
  }

  const allowedSet = new Set<string>(allowed);
  const filtered = groups.filter((group) => allowedSet.has(group.code));

  return filtered.length > 0 ? filtered : groups;
}
