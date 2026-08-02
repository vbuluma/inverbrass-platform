/**
 * ENG-003k — Industry-native classification / category labels.
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 */

export const INDUSTRY_CLASSIFICATION_LABELS: Record<string, string> = {
  COMMERCE: "Categories",
  FINANCIAL: "Product Categories",
  HEALTHCARE: "Service Categories",
  EDUCATION: "Programme Categories",
  PROPERTY: "Property Types",
  HOSPITALITY: "Menu Categories",
  AGRICULTURE: "Product Categories",
  TRANSPORT: "Service Categories",
  MANUFACTURING: "Product Categories",
  PROFESSIONAL: "Service Categories",
  SALON: "Service Categories",
  GOVERNMENT: "Service Categories",
  NGO: "Programme Categories",
  NON_PROFIT: "Programme Categories",
};

export const DEFAULT_CLASSIFICATION_LABEL = "Categories";

export function resolveClassificationLabel(
  industryCode: string | null | undefined
): string {
  if (!industryCode) {
    return DEFAULT_CLASSIFICATION_LABEL;
  }
  return (
    INDUSTRY_CLASSIFICATION_LABELS[industryCode] ?? DEFAULT_CLASSIFICATION_LABEL
  );
}

export function resolveClassificationLabelSingular(
  industryCode: string | null | undefined
): string {
  const plural = resolveClassificationLabel(industryCode);
  if (plural.endsWith("ies")) {
    return `${plural.slice(0, -3)}y`;
  }
  if (plural.endsWith("s")) {
    return plural.slice(0, -1);
  }
  return plural;
}
