/**
 * Purpose:
 * Client-safe business operational route matching for platform chrome.
 */

export const BUSINESS_APP_PREFIXES = [
  "/dashboard",
  "/parties",
  "/groups",
  "/products",
  "/crm",
  "/settings",
];

export function isBusinessAppRoute(pathname: string): boolean {
  return BUSINESS_APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
