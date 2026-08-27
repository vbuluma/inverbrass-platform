export const CRM_COMMUNICATION_CUSTOMER_360_WIDGETS = [
  {
    id: "recent-communications",
    label: "Recent Communications",
    description: "Recent communication log entries for this customer",
    dataKey: "recentCommunications",
  },
  {
    id: "last-interaction-channel",
    label: "Last Interaction Channel",
    description: "Most recent communication channel with the customer",
    dataKey: "lastInteractionChannel",
  },
] as const;

export const CRM_COMMUNICATION_CUSTOMER_360_TIMELINE_EVENTS = [
  "COMMUNICATION_SENT",
  "COMMUNICATION_RECEIVED",
  "COMMUNICATION_BLOCKED",
] as const;

export const CRM_COMMUNICATION_CUSTOMER_360_QUICK_ACTIONS = [
  {
    id: "log-communication",
    label: "Log Communication",
    hrefSuffix: "/crm/communications/new",
  },
] as const;
