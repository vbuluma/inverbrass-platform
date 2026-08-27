/**
 * Purpose:
 * Metadata catalog for Customer 360 extension points.
 *
 * Widgets are declared here first; contributing IPs register loaders
 * that replace placeholders when implemented.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import type { Customer360WidgetZone } from "@/modules/crm/customer-360/widget-registry";

export type Customer360LayoutProfile = "individual" | "entity" | "all";

export type Customer360WidgetCatalogEntry = {
  id: string;
  sourceIp: string;
  ownerModule: string;
  title: string;
  zone: Customer360WidgetZone;
  order: number;
  defaultEnabled: boolean;
  layoutProfiles: Customer360LayoutProfile[];
  placeholderHint: string;
  futureBuildPack?: string;
};

/** Authoritative catalog — metadata-driven extension points for Customer 360. */
export const CUSTOMER_360_WIDGET_CATALOG: Customer360WidgetCatalogEntry[] = [
  {
    id: "health-summary",
    sourceIp: "IP-01",
    ownerModule: "CRM Foundation",
    title: "Relationship Health",
    zone: "health",
    order: 10,
    defaultEnabled: true,
    layoutProfiles: ["all"],
    placeholderHint: "Health score from IP-12 Customer Analytics.",
  },
  {
    id: "active-lead",
    sourceIp: "IP-02",
    ownerModule: "Lead Management",
    title: "Active Lead",
    zone: "business-summary",
    order: 20,
    defaultEnabled: true,
    layoutProfiles: ["all"],
    placeholderHint: "Lead summary widget — provided by IP-02.",
  },
  {
    id: "open-opportunities",
    sourceIp: "IP-03",
    ownerModule: "Opportunity Management",
    title: "Open Opportunities",
    zone: "business-summary",
    order: 30,
    defaultEnabled: true,
    layoutProfiles: ["all"],
    placeholderHint: "Pipeline widgets activate when IP-03 is implemented.",
  },
  {
    id: "account-hierarchy",
    sourceIp: "IP-04",
    ownerModule: "Account & Contact Management",
    title: "Account Hierarchy",
    zone: "business-summary",
    order: 40,
    defaultEnabled: true,
    layoutProfiles: ["entity", "all"],
    placeholderHint: "Account widgets activate when IP-04 is implemented.",
  },
  {
    id: "products-held",
    sourceIp: "BP-003",
    ownerModule: "Products & Services",
    title: "Products & Services",
    zone: "business-summary",
    order: 50,
    defaultEnabled: true,
    layoutProfiles: ["all"],
    placeholderHint: "Offering ownership widgets arrive from future Build Packs.",
    futureBuildPack: "BP-003+",
  },
  {
    id: "tasks-due",
    sourceIp: "IP-05",
    ownerModule: "Activities",
    title: "Tasks Due",
    zone: "insights",
    order: 60,
    defaultEnabled: true,
    layoutProfiles: ["all"],
    placeholderHint: "Activity widgets activate when IP-05 is implemented.",
  },
  {
    id: "next-appointment",
    sourceIp: "IP-06",
    ownerModule: "Calendar",
    title: "Next Appointment",
    zone: "insights",
    order: 70,
    defaultEnabled: true,
    layoutProfiles: ["all"],
    placeholderHint: "Calendar widgets activate when IP-06 is implemented.",
  },
  {
    id: "recent-visits",
    sourceIp: "IP-07",
    ownerModule: "Visits",
    title: "Recent Visits",
    zone: "insights",
    order: 80,
    defaultEnabled: true,
    layoutProfiles: ["all"],
    placeholderHint: "Visit widgets activate when IP-07 is implemented.",
  },
  {
    id: "last-interaction",
    sourceIp: "IP-08",
    ownerModule: "Communications",
    title: "Last Interaction",
    zone: "insights",
    order: 90,
    defaultEnabled: true,
    layoutProfiles: ["all"],
    placeholderHint: "Communication widgets activate when IP-08 is implemented.",
  },
  {
    id: "open-cases",
    sourceIp: "IP-09",
    ownerModule: "Cases",
    title: "Open Cases",
    zone: "insights",
    order: 100,
    defaultEnabled: true,
    layoutProfiles: ["all"],
    placeholderHint: "Case widgets activate when IP-09 is implemented.",
  },
  {
    id: "outstanding-quotes",
    sourceIp: "IP-10",
    ownerModule: "Quotations",
    title: "Outstanding Quotations",
    zone: "business-summary",
    order: 110,
    defaultEnabled: true,
    layoutProfiles: ["all"],
    placeholderHint: "Quotation widgets provided by IP-10.",
  },
  {
    id: "campaign-membership",
    sourceIp: "IP-11",
    ownerModule: "Campaigns",
    title: "Campaign Membership",
    zone: "insights",
    order: 120,
    defaultEnabled: true,
    layoutProfiles: ["all"],
    placeholderHint: "Campaign widgets provided by IP-11.",
  },
  {
    id: "customer-analytics",
    sourceIp: "IP-12",
    ownerModule: "Analytics",
    title: "Customer Analytics",
    zone: "health",
    order: 130,
    defaultEnabled: true,
    layoutProfiles: ["all"],
    placeholderHint: "Customer-scoped analytics provided by IP-12.",
  },
];

export const CUSTOMER_360_ZONE_LABELS: Record<Customer360WidgetZone, string> = {
  "business-summary": "Business Summary",
  insights: "Customer Insights",
  health: "Health Summary",
};
