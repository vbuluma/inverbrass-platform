/**
 * Purpose:
 * User-facing labels for Product Attributes Engine UI.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

export const ATTRIBUTE_UI_LABELS = {
  moduleName: "Product Attributes",
  dashboardTitle: "Product Attributes",
  dashboardDescription:
    "Configure metadata-driven characteristics for products and services without schema changes.",
  groupRegistrationTitle: "Create Attribute Group",
  groupRegistrationDescription:
    "Organize related attribute definitions into reusable groups.",
  definitionRegistrationTitle: "Create Attribute Definition",
  definitionRegistrationDescription:
    "Define a configurable field with data type, validation, and display rules.",
  groupWorkspaceTitle: "Attribute Group Workspace",
  definitionWorkspaceTitle: "Attribute Definition Workspace",
  metricsTotalGroups: "Attribute Groups",
  metricsTotalAttributes: "Total Attributes",
  metricsActive: "Active",
  metricsArchived: "Archived",
  metricsRecent: "Recently Updated",
  assignmentHeading: "Scope Assignment",
  assignmentDescription:
    "Assign attributes to product types or catalogue classifications.",
  productPanelHeading: "Product Attributes",
  productPanelDescription:
    "Dynamic attribute values configured for this product.",
  timelineHeading: "Timeline",
  auditHeading: "Audit History",
  quickActionGroup: "Create Group",
  quickActionDefinition: "Create Definition",
  quickActionAssign: "Manage Assignments",
} as const;

export const ATTRIBUTE_GROUP_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", available: true },
  { id: "definitions", label: "Definitions", available: true },
  { id: "timeline", label: "Timeline", available: true },
  { id: "audit-history", label: "Audit History", available: true },
] as const;

export const ATTRIBUTE_DEFINITION_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", available: true },
  { id: "options", label: "Options", available: true },
  { id: "assignment", label: "Scope Assignment", available: true },
  { id: "timeline", label: "Timeline", available: true },
  { id: "audit-history", label: "Audit History", available: true },
] as const;
