/**
 * Purpose:
 * Client-safe business operational route matching for platform chrome.
 */

export const BUSINESS_APP_PREFIXES = [
  "/dashboard",
  "/parties",
  "/groups",
  "/products",
  "/customers",
  "/leads",
  "/opportunities",
  "/accounts",
  "/quotations",
  "/sales",
  "/payments",
  "/invoices",
  "/receipts",
  "/campaigns",
  "/crm-analytics",
  "/crm",
  "/settings",
];

export function isBusinessAppRoute(pathname: string): boolean {
  return BUSINESS_APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
