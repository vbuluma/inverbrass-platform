/**
 * Purpose:
 * Path-based breadcrumb defaults for business operational routes.
 *
 * Dynamic segments (party names, tab labels) are supplied by page components
 * via BreadcrumbProvider overrides.
 *
 * Hub-first IA (NAV-001): nested capabilities include their parent hub.
 */

import type { BreadcrumbItem } from "@/lib/navigation/types";

const STATIC_SEGMENTS: Record<string, string> = {
  dashboard: "Dashboard",
  parties: "Parties",
  groups: "Groups",
  customers: "Customer Profile",
  leads: "Leads",
  opportunities: "Opportunities",
  accounts: "Accounts",
  products: "Offerings",
  crm: "CRM",
  sales: "Sales",
  payments: "Payments",
  invoices: "Invoices",
  receipts: "Receipts",
  inventory: "Inventory",
  procurement: "Procurement",
  suppliers: "Suppliers",
  requests: "Purchase Requests",
  sourcing: "Sourcing",
  evaluations: "Evaluations",
  awards: "Awards",
  commercial: "Commercial",
  resolve: "Price a sale",
  governance: "Governance",
  "tax-compliance": "Tax obligations",
  campaigns: "Campaigns",
  "crm-analytics": "Analytics",
  quotations: "Quotations",
  activities: "Activities",
  appointments: "Appointments",
  visits: "Visits",
  communications: "Communications",
  cases: "Cases",
  locations: "Locations",
  receive: "Receiving",
  "opening-balances": "Opening balances",
  transfers: "Transfers",
  reservations: "Reservations",
  adjustments: "Adjustments",
  stocktakes: "Stocktake",
  traceability: "Traceability",
  controls: "Inventory controls",
  exceptions: "Exceptions",
  catalogue: "Catalogue",
  classifications: "Classifications",
  units: "Units",
  variants: "Variants",
  bundles: "Bundles",
  "convert-quote": "Convert quote",
  new: "Registration",
  settings: "Settings",
  setup: "Business Setup",
};

type HubCrumbRule = {
  match: (segments: string[]) => boolean;
  crumbs: BreadcrumbItem[];
  skipFirst?: number;
};

const HUB_CRUMB_RULES: HubCrumbRule[] = [
  {
    match: (segments) => segments[0] === "customers",
    crumbs: [{ label: "CRM", href: "/crm" }],
  },
  {
    match: (segments) =>
      ["leads", "opportunities", "accounts", "quotations"].includes(
        segments[0] ?? ""
      ),
    crumbs: [
      { label: "CRM", href: "/crm" },
      { label: "Pipeline" },
    ],
  },
  {
    match: (segments) => segments[0] === "campaigns",
    crumbs: [{ label: "CRM", href: "/crm" }],
  },
  {
    match: (segments) => segments[0] === "crm-analytics",
    crumbs: [{ label: "CRM", href: "/crm" }],
  },
  {
    match: (segments) =>
      segments[0] === "crm" && segments[1] === "governance",
    crumbs: [{ label: "Settings", href: "/settings" }],
    skipFirst: 1,
  },
  {
    match: (segments) =>
      segments[0] === "crm" &&
      ["activities", "appointments", "visits", "communications", "cases"].includes(
        segments[1] ?? ""
      ),
    crumbs: [
      { label: "CRM", href: "/crm" },
      { label: "Engagement" },
    ],
    skipFirst: 1,
  },
  {
    match: (segments) =>
      segments[0] === "commercial" && segments[1] === "resolve",
    crumbs: [{ label: "Sales", href: "/sales" }],
    skipFirst: 1,
  },
  {
    match: (segments) =>
      segments[0] === "commercial" &&
      (segments[1] === "governance" || segments[1] === "tax-compliance"),
    crumbs: [{ label: "Settings", href: "/settings" }],
    skipFirst: 1,
  },
  {
    match: (segments) => segments[0] === "invoices" || segments[0] === "receipts",
    crumbs: [{ label: "Payments", href: "/payments" }],
  },
  {
    match: (segments) =>
      segments[0] === "procurement" && segments[1] === "requests",
    crumbs: [{ label: "Procurement", href: "/procurement" }],
    skipFirst: 1,
  },
  {
    match: (segments) =>
      segments[0] === "procurement" && segments[1] === "sourcing",
    crumbs: [
      { label: "Procurement", href: "/procurement" },
      { label: "Sourcing", href: "/procurement/sourcing" },
    ],
    skipFirst: 2,
  },
];

export function buildDefaultBreadcrumbs(
  pathname: string,
  labelOverrides?: Partial<Record<string, string>>
): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || segments[0] === "dashboard") {
    return [{ label: "Dashboard" }];
  }

  const items: BreadcrumbItem[] = [{ label: "Dashboard", href: "/dashboard" }];
  const hubRule = HUB_CRUMB_RULES.find((rule) => rule.match(segments));
  if (hubRule) {
    items.push(...hubRule.crumbs);
  }

  const startIndex = hubRule?.skipFirst ?? 0;
  let path = "";
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    path += `/${segment}`;

    if (index < startIndex) {
      continue;
    }

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
