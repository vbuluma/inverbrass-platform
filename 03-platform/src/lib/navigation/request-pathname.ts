/**
 * Purpose:
 * Resolve the active pathname for server layouts (set by middleware).
 */

import { headers } from "next/headers";

const BUSINESS_APP_PREFIXES = ["/dashboard", "/parties", "/settings"];

export async function getRequestPathname(): Promise<string> {
  const headerStore = await headers();
  return headerStore.get("x-pathname") ?? "/";
}

export function isBusinessAppRoute(pathname: string): boolean {
  return BUSINESS_APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
