export const CRM_VISIT_CUSTOMER_360_WIDGETS = [
  {
    id: "upcoming-visits",
    label: "Upcoming Visits",
    description: "Scheduled future visits (non-cancelled)",
    dataKey: "upcomingVisits",
  },
  {
    id: "recent-visits",
    label: "Recent Visits",
    description: "Latest visit and call reports",
    dataKey: "recentVisits",
  },
  {
    id: "open-call-report-actions",
    label: "Open Call-Report Actions",
    description: "Open action items from visit reports",
    dataKey: "openActionItems",
  },
  {
    id: "pending-visit-approvals",
    label: "Pending Approvals",
    description: "Visit reports awaiting review",
    dataKey: "pendingApprovals",
  },
] as const;

export const CRM_VISIT_CUSTOMER_360_TIMELINE_EVENTS = [
  "VISIT_PLANNED",
  "VISIT_COMPLETED",
  "CALL_REPORT_SUBMITTED",
  "CALL_REPORT_APPROVED",
  "CALL_REPORT_RETURNED",
  "CALL_REPORT_REJECTED",
] as const;
