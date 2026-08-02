/**
 * Purpose:
 * Path-based breadcrumb defaults for business operational routes.
 *
 * Dynamic segments (party names, tab labels) are supplied by page components
 * via BreadcrumbProvider overrides.
 */

import type { BreadcrumbItem } from "@/lib/navigation/types";

const STATIC_SEGMENTS: Record<string, string> = {
  dashboard: "Dashboard",
  parties: "Parties",
  products: "Offerings",
  new: "Registration",
  settings: "Settings",
  setup: "Business Setup",
};

export function buildDefaultBreadcrumbs(
  pathname: string,
  labelOverrides?: Partial<Record<string, string>>
): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || segments[0] === "dashboard") {
    return [{ label: "Dashboard" }];
  }

  const items: BreadcrumbItem[] = [{ label: "Dashboard", href: "/dashboard" }];

  let path = "";
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    path += `/${segment}`;

    const isLast = index === segments.length - 1;
    const isDynamicId =
      segment !== "new" &&
      /^[0-9a-f-]{36}$/i.test(segment);

    if (isDynamicId) {
      items.push({ label: "Details" });
      continue;
    }

    const label =
      labelOverrides?.[segment] ??
      STATIC_SEGMENTS[segment] ??
      formatSegmentLabel(segment);
    items.push({
      label,
      href: isLast ? undefined : path,
    });
  }

  return items;
}

function formatSegmentLabel(segment: string): string {
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
