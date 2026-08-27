/**
 * ENG-003k — Stable platform navigation labels (industry-independent).
 *
 * Primary sidebar navigation uses these labels. Industry-specific wording
 * appears inside workspaces after the user enters Offerings.
 */

/** Stable sidebar / breadcrumb label for the offerings module (route: /products). */
export const PLATFORM_NAV_OFFERING_LABEL = "Offerings";

export const PLATFORM_NAV_LABELS = {
  dashboard: "Dashboard",
  parties: "Parties",
  groups: "Groups",
  offerings: PLATFORM_NAV_OFFERING_LABEL,
  solutions: "Solutions",
  favorites: "Favorites",
  recent: "Recent Items",
  settings: "Settings",
} as const;

export function resolvePlatformNavOfferingLabel(): string {
  return PLATFORM_NAV_OFFERING_LABEL;
}
