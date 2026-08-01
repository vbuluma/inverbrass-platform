/**
 * Purpose:
 * User-facing labels for Product Bundles Engine UI.
 *
 * Implementation Package:
 * BP-003 / IP-006 – Bundles & Packages Engine
 */

export const BUNDLE_UI_LABELS = {
  moduleName: "Product Bundles",
  dashboardTitle: "Product Bundles",
  dashboardDescription:
    "Create composite commercial offerings from products, services, and variants.",
  registrationTitle: "Register Bundle",
  registrationDescription:
    "Define bundle details, select products, configure quantities, and review.",
  workspaceTitle: "Bundle Workspace",
  metricsTotal: "Total Bundles",
  metricsActive: "Active",
  metricsDraft: "Draft",
  metricsArchived: "Archived",
  metricsRecent: "Recently Updated",
  productPanelHeading: "Member Of Bundles",
  productPanelDescription:
    "Bundles and packages that include this offering as a line item.",
  timelineHeading: "Timeline",
  auditHeading: "Audit History",
  quickActionRegister: "Create Bundle",
  itemsHeading: "Bundle Items",
  itemsDescription: "Products and variants that compose this bundle.",
  pricingPlaceholderTitle: "Pricing — Coming Soon",
  pricingPlaceholderDescription:
    "Bundle pricing calculations will be delivered by the Pricing Engine.",
  analyticsPlaceholderTitle: "Analytics — Coming Soon",
  analyticsPlaceholderDescription:
    "Bundle performance analytics will be delivered in a future Build Pack.",
} as const;

export const BUNDLE_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", available: true },
  { id: "bundle-items", label: "Bundle Items", available: true },
  { id: "timeline", label: "Timeline", available: true },
  { id: "audit-history", label: "Audit History", available: true },
  { id: "pricing", label: "Pricing", available: false },
  { id: "analytics", label: "Analytics", available: false },
] as const;

export const BUNDLE_REGISTRATION_STEPS = [
  { id: "details", label: "Bundle Details" },
  { id: "select-products", label: "Select Products" },
  { id: "configure", label: "Configure Quantities" },
  { id: "review", label: "Review" },
] as const;
