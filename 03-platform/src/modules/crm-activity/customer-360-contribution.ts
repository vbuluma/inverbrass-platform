/**
 * Purpose:
 * Customer 360 widget contract for BP-004 / IP-05.
 */

export const CRM_ACTIVITY_CUSTOMER_360_WIDGETS = [
  {
    id: "recent-activities",
    label: "Recent Activities",
    description: "Latest customer activities (most recent first)",
    dataKey: "recentActivities",
  },
  {
    id: "open-tasks",
    label: "Open Tasks",
    description: "Open and in-progress activities not yet completed",
    dataKey: "openTasks",
  },
  {
    id: "overdue-tasks",
    label: "Overdue Tasks",
    description: "Activities past due date and not completed",
    dataKey: "overdueTasks",
  },
  {
    id: "upcoming-activities",
    label: "Upcoming Activities",
    description: "Scheduled activities with future due dates",
    dataKey: "upcomingActivities",
  },
] as const;

export const CRM_ACTIVITY_CUSTOMER_360_INSIGHTS = [
  { id: "next-follow-up", label: "Next Follow-up" },
  { id: "overdue-count", label: "Overdue Count" },
  { id: "open-count", label: "Open Task Count" },
] as const;

export const CRM_ACTIVITY_CUSTOMER_360_TIMELINE_EVENTS = [
  "ACTIVITY_CREATED",
  "ACTIVITY_COMPLETED",
  "ACTIVITY_OVERDUE",
  "ACTIVITY_CANCELLED",
  "ACTIVITY_DEFERRED",
] as const;

export const CRM_ACTIVITY_CUSTOMER_360_QUICK_ACTIONS = [
  { id: "log-activity", label: "Log Activity", hrefSuffix: "/crm/activities/new" },
  { id: "complete-task", label: "Complete Task" },
] as const;
