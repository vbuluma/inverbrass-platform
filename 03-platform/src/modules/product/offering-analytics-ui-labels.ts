/**
 * Purpose:
 * User-facing labels for Offering Analytics UI.
 *
 * Implementation Package:
 * BP-003 / IP-012 – Offering Analytics & Performance
 */

export const OFFERING_ANALYTICS_UI_LABELS = {
  dashboardTitle: "Offering Analytics",
  dashboardDescription:
    "Measure offering performance with configurable KPIs and immutable metric snapshots.",
  panelTitle: "Analytics",
  panelDescription:
    "Operational analytics for this offering. Business transaction metrics will populate as future Build Packs connect.",
  sectionPerformanceSummary: "Performance Summary",
  sectionKpiCards: "KPI Cards",
  sectionOfferingHealth: "Offering Health",
  sectionLifecycle: "Lifecycle Summary",
  sectionCompliance: "Compliance Summary",
  sectionCommercial: "Commercial Summary",
  sectionRelationships: "Relationship Summary",
  sectionPricing: "Pricing Summary",
  sectionRecentActivity: "Recent Activity",
  sectionTrends: "Trends",
  refreshAnalytics: "Refresh Analytics",
  exportAnalytics: "Export",
  exportPlaceholder:
    "Export will generate reports when the Reporting Engine integration is available.",
  filterDateFrom: "From",
  filterDateTo: "To",
  filterCategory: "Metric Category",
  filterPeriod: "Snapshot Period",
  compareOfferings: "Compare Offerings",
  noSnapshots: "No metric snapshots yet.",
  noSnapshotsHint: "Refresh analytics to generate the first snapshot.",
  pendingMetric: "Awaiting module data",
  searchPlaceholder: "Search metrics or offerings…",
  metricsTotal: "Metric Definitions",
  snapshotsTotal: "Snapshots",
  offeringsTracked: "Offerings Tracked",
  lastRefreshed: "Last Refreshed",
} as const;
