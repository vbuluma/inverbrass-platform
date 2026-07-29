/**
 * Purpose:
 * Resolve the active pathname for server layouts (set by middleware).
 */

import { headers } from "next/headers";

import { isBusinessAppRoute } from "@/lib/navigation/business-app-routes";

export { isBusinessAppRoute };

export async function getRequestPathname(): Promise<string> {
  const headerStore = await headers();
  return headerStore.get("x-pathname") ?? "/";
}
