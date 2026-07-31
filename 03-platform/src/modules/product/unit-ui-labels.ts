/**
 * Purpose:
 * User-facing labels for Units of Measure UI.
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

export const UNIT_UI_LABELS = {
  moduleName: "Units of Measure",
  dashboardTitle: "Units of Measure",
  dashboardDescription:
    "Standardize quantities, conversions, and precision across your catalogue.",
  registrationTitle: "Register Unit",
  registrationDescription:
    "Define a measurable unit with category, conversion factor, and precision rules.",
  workspaceTitle: "Unit Workspace",
  metricsTotal: "Total Units",
  metricsActive: "Active Units",
  metricsCategories: "Categories",
  metricsRecent: "Recently Updated",
  conversionHeading: "Conversion Rules",
  conversionDescription:
    "Convert between units in the same category using configured factors.",
  timelineHeading: "Timeline",
  auditHeading: "Audit History",
  quickActionRegister: "Register Unit",
  quickActionCategories: "Categories",
} as const;

export const UNIT_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", available: true },
  { id: "conversion-rules", label: "Conversion Rules", available: true },
  { id: "timeline", label: "Timeline", available: true },
  { id: "audit-history", label: "Audit History", available: true },
] as const;
