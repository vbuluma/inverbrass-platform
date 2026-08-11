export const CRM_CASE_CUSTOMER_360_WIDGETS = [
  {
    id: "open-cases",
    label: "Open Cases",
    description: "Active service cases for this customer",
    dataKey: "openCaseCount",
  },
  {
    id: "sla-at-risk",
    label: "SLA At Risk",
    description: "Open cases approaching SLA due",
    dataKey: "slaAtRiskCount",
  },
  {
    id: "breached-cases",
    label: "Breached Cases",
    description: "Open cases past SLA resolution due",
    dataKey: "breachedCaseCount",
  },
  {
    id: "recent-cases",
    label: "Recent Cases",
    description: "Most recently opened cases",
    dataKey: "recentCases",
  },
  {
    id: "escalated-cases",
    label: "Escalated Cases",
    description: "Cases currently escalated",
    dataKey: "escalatedCaseCount",
  },
  {
    id: "last-complaint",
    label: "Last Complaint",
    description: "Most recent complaint case",
    dataKey: "lastComplaint",
  },
] as const;

export const CRM_CASE_CUSTOMER_360_TIMELINE_EVENTS = [
  "CASE_OPENED",
  "CASE_ESCALATED",
  "CASE_RESOLVED",
  "CASE_CLOSED",
] as const;

export const CRM_CASE_CUSTOMER_360_QUICK_ACTIONS = [
  {
    id: "create-case",
    label: "Create Case",
    hrefSuffix: "/crm/cases/new",
  },
] as const;
