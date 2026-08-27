/**
 * Domain constants for BP-004 / IP-05 Activity & Task Management.
 *
 * Well-known codes align with metadata catalogues (crm_activity_type/status/priority).
 * UI and services load labels from catalogues; constants provide fallbacks and rules.
 */

/** @deprecated Use ASSIGNED — retained for migration compatibility */
export const CRM_ACTIVITY_LEGACY_STATUS_OPEN = "OPEN";

export const CRM_ACTIVITY_TYPE_CODES = {
  CALL: "CALL",
  MEETING: "MEETING",
  VISIT: "VISIT",
  TASK: "TASK",
  FOLLOW_UP: "FOLLOW_UP",
  EMAIL: "EMAIL",
  REMINDER: "REMINDER",
  DOCUMENT_REVIEW: "DOCUMENT_REVIEW",
  APPROVAL: "APPROVAL",
  NOTE: "NOTE",
  OTHER: "OTHER",
} as const;

export type CrmActivityTypeCode =
  (typeof CRM_ACTIVITY_TYPE_CODES)[keyof typeof CRM_ACTIVITY_TYPE_CODES];

export const CRM_ACTIVITY_STATUS_CODES = {
  PLANNED: "PLANNED",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  WAITING: "WAITING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  DEFERRED: "DEFERRED",
} as const;

export type CrmActivityStatusCode =
  (typeof CRM_ACTIVITY_STATUS_CODES)[keyof typeof CRM_ACTIVITY_STATUS_CODES];

/** Computed indicator — not a persisted status code. */
export const CRM_ACTIVITY_COMPUTED_OVERDUE = "OVERDUE" as const;

export const CRM_ACTIVITY_PRIORITY_CODES = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;

export type CrmActivityPriorityCode =
  (typeof CRM_ACTIVITY_PRIORITY_CODES)[keyof typeof CRM_ACTIVITY_PRIORITY_CODES];

export const CRM_ACTIVITY_OPEN_STATUS_CODES: CrmActivityStatusCode[] = [
  CRM_ACTIVITY_STATUS_CODES.PLANNED,
  CRM_ACTIVITY_STATUS_CODES.ASSIGNED,
  CRM_ACTIVITY_STATUS_CODES.IN_PROGRESS,
  CRM_ACTIVITY_STATUS_CODES.WAITING,
  CRM_ACTIVITY_STATUS_CODES.DEFERRED,
];

export const CRM_ACTIVITY_TERMINAL_STATUS_CODES: CrmActivityStatusCode[] = [
  CRM_ACTIVITY_STATUS_CODES.COMPLETED,
  CRM_ACTIVITY_STATUS_CODES.CANCELLED,
];

export const CRM_ACTIVITY_RECORD_SOURCE_CODES = {
  MANUAL: "MANUAL",
  RULE_TRIGGERED: "RULE_TRIGGERED",
  VISIT_ACTION_ITEM: "VISIT_ACTION_ITEM",
  CASE_ACTION: "CASE_ACTION",
  APPOINTMENT: "APPOINTMENT",
  BULK: "BULK",
} as const;

export type CrmActivityRecordSourceCode =
  (typeof CRM_ACTIVITY_RECORD_SOURCE_CODES)[keyof typeof CRM_ACTIVITY_RECORD_SOURCE_CODES];

export const CRM_ACTIVITY_RECORD_SOURCE_LABELS: Record<
  CrmActivityRecordSourceCode,
  string
> = {
  MANUAL: "Manual",
  RULE_TRIGGERED: "Rule Triggered",
  VISIT_ACTION_ITEM: "Visit Action Item",
  CASE_ACTION: "Case Action",
  APPOINTMENT: "Appointment",
  BULK: "Bulk Assignment",
};

export const CRM_ACTIVITY_ENTITY_TYPE_CODES = {
  PARTY: "PARTY",
  CRM_RECORD: "CRM_RECORD",
  ACCOUNT: "ACCOUNT",
  LEAD: "LEAD",
  OPPORTUNITY: "OPPORTUNITY",
  CASE: "CASE",
  CONTACT: "CONTACT",
  VISIT: "VISIT",
  APPOINTMENT: "APPOINTMENT",
} as const;

export type CrmActivityEntityTypeCode =
  (typeof CRM_ACTIVITY_ENTITY_TYPE_CODES)[keyof typeof CRM_ACTIVITY_ENTITY_TYPE_CODES];

export const CRM_ACTIVITY_ENTITY_TYPE_LABELS: Record<
  CrmActivityEntityTypeCode,
  string
> = {
  PARTY: "Party",
  CRM_RECORD: "CRM Record",
  ACCOUNT: "Account",
  LEAD: "Lead",
  OPPORTUNITY: "Opportunity",
  CASE: "Case",
  CONTACT: "Contact",
  VISIT: "Visit",
  APPOINTMENT: "Appointment",
};

export const CRM_ACTIVITY_LIST_VIEWS = {
  MY: "MY",
  TEAM: "TEAM",
  OVERDUE: "OVERDUE",
  UPCOMING: "UPCOMING",
  ALL: "ALL",
} as const;

export type CrmActivityListView =
  (typeof CRM_ACTIVITY_LIST_VIEWS)[keyof typeof CRM_ACTIVITY_LIST_VIEWS];

export const CRM_ACTIVITY_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", available: true },
  { id: "audit-history", label: "Audit History", available: true },
] as const;

export const CRM_ACTIVITY_NUMBER_PREFIX = "ACT";

export const CRM_ACTIVITY_TYPE_LABELS: Record<CrmActivityTypeCode, string> = {
  CALL: "Call",
  MEETING: "Meeting",
  VISIT: "Visit",
  TASK: "Task",
  FOLLOW_UP: "Follow-up",
  EMAIL: "Email",
  REMINDER: "Reminder",
  DOCUMENT_REVIEW: "Document Review",
  APPROVAL: "Approval",
  NOTE: "Note",
  OTHER: "Other",
};

export const CRM_ACTIVITY_STATUS_LABELS: Record<CrmActivityStatusCode, string> = {
  PLANNED: "Planned",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  WAITING: "Waiting",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DEFERRED: "Deferred",
};

export const CRM_ACTIVITY_PRIORITY_LABELS: Record<CrmActivityPriorityCode, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const CRM_ACTIVITY_OUTCOME_CODES = {
  SUCCESSFUL: "SUCCESSFUL",
  NO_ANSWER: "NO_ANSWER",
  LEFT_MESSAGE: "LEFT_MESSAGE",
  FOLLOW_UP_REQUIRED: "FOLLOW_UP_REQUIRED",
  NOT_INTERESTED: "NOT_INTERESTED",
  COMPLETED: "COMPLETED",
  OTHER: "OTHER",
} as const;

export type CrmActivityOutcomeCode =
  (typeof CRM_ACTIVITY_OUTCOME_CODES)[keyof typeof CRM_ACTIVITY_OUTCOME_CODES];

export const CRM_ACTIVITY_OUTCOME_LABELS: Record<CrmActivityOutcomeCode, string> = {
  SUCCESSFUL: "Successful",
  NO_ANSWER: "No Answer",
  LEFT_MESSAGE: "Left Message",
  FOLLOW_UP_REQUIRED: "Follow-up Required",
  NOT_INTERESTED: "Not Interested",
  COMPLETED: "Completed",
  OTHER: "Other",
};

/** Documented business rules — enforced in crm-activity-rules.ts */
export const CRM_ACTIVITY_BUSINESS_RULES = {
  BRU_COMPLETED_READ_ONLY: "Completed activities are read-only except addendum notes.",
  BRU_DUE_AFTER_ACTIVITY_DATE: "Due date cannot precede the activity date.",
  BRU_INACTIVE_OWNER: "Cannot assign an inactive employee as owner.",
  BRU_OVERDUE_COMPLETION_NOTE:
    "Overdue activities require completion notes when marked complete.",
  BRU_TYPE_MANDATORY_NOTES:
    "Activity types flagged in metadata require completion notes.",
  BRU_ENTITY_LINK_REQUIRED: "Every activity must link to at least one Party or CRM entity.",
} as const;

/**
 * Bulk activity architecture (future — not implemented in v1).
 * Service layer accepts array payloads; repository supports insertMany on links.
 */
export const CRM_ACTIVITY_BULK_ARCHITECTURE = {
  supportedOperations: ["CREATE", "ASSIGN", "REASSIGN"] as const,
  pattern:
    "BulkCrmActivityService.createMany(items[]) → single transaction → optional BULK record source",
} as const;
