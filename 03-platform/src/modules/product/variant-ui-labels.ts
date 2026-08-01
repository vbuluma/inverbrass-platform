/**
 * Purpose:
 * User-facing labels for Product Variants Engine UI.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

export const VARIANT_UI_LABELS = {
  moduleName: "Product Variants",
  dashboardTitle: "Product Variants",
  dashboardDescription:
    "Manage sellable versions of master offerings with distinguishing attributes.",
  registrationTitle: "Register Variant",
  registrationDescription:
    "Create a new variant with a unique code and distinguishing attribute values.",
  workspaceTitle: "Variant Workspace",
  metricsTotal: "Total Variants",
  metricsActive: "Active",
  metricsDraft: "Draft",
  metricsArchived: "Archived",
  metricsParentOfferings: "Parent Offerings",
  metricsRecent: "Recently Updated",
  productPanelHeading: "Variants",
  productPanelDescription:
    "Sellable versions of this offering. Variants are optional — simple offerings may have none.",
  timelineHeading: "Timeline",
  auditHeading: "Audit History",
  quickActionRegister: "Register Variant",
  cloneAction: "Clone Variant",
} as const;

export const VARIANT_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", available: true },
  { id: "attributes", label: "Attributes", available: true },
  { id: "timeline", label: "Timeline", available: true },
  { id: "audit-history", label: "Audit History", available: true },
] as const;
