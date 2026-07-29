/**
 * Purpose:
 * Mask sensitive identifier values for unauthorized viewers.
 *
 * Engine:
 * ENG-003j – Identity & Regulatory Identification Engine
 */

export function maskIdentifierValue(value: string, visibleSuffixLength = 4): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "—";
  }

  if (trimmed.length <= visibleSuffixLength) {
    return "*".repeat(trimmed.length);
  }

  const suffix = trimmed.slice(-visibleSuffixLength);
  return `${"*".repeat(Math.max(4, trimmed.length - visibleSuffixLength))}${suffix}`;
}

export function formatIdentifierForDisplay(
  value: string,
  canViewFullValue: boolean
): string {
  return canViewFullValue ? value : maskIdentifierValue(value);
}
