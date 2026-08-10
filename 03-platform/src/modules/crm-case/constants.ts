/**
 * Domain constants for BP-004 / IP-09 Case & Service Request Management.
 */

export const CRM_CASE_TYPE_CODES = {
  ENQUIRY: "ENQUIRY",
  COMPLAINT: "COMPLAINT",
  FEEDBACK: "FEEDBACK",
  SERVICE_REQUEST: "SERVICE_REQUEST",
  QUERY: "QUERY",
  INCIDENT: "INCIDENT",
  INVESTIGATION: "INVESTIGATION",
  FOLLOW_UP: "FOLLOW_UP",
} as const;

export type CrmCaseTypeCode =
  (typeof CRM_CASE_TYPE_CODES)[keyof typeof CRM_CASE_TYPE_CODES];

export const CRM_CASE_STATUS_CODES = {
  NEW: "NEW",
  OPEN: "OPEN",
  PENDING_CUSTOMER: "PENDING_CUSTOMER",
  ESCALATED: "ESCALATED",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;

export type CrmCaseStatusCode =
  (typeof CRM_CASE_STATUS_CODES)[keyof typeof CRM_CASE_STATUS_CODES];

export const CRM_CASE_PRIORITY_CODES = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;

export type CrmCasePriorityCode =
  (typeof CRM_CASE_PRIORITY_CODES)[keyof typeof CRM_CASE_PRIORITY_CODES];

export const CRM_CASE_SEVERITY_CODES = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;

export type CrmCaseSeverityCode =
  (typeof CRM_CASE_SEVERITY_CODES)[keyof typeof CRM_CASE_SEVERITY_CODES];

export const CRM_CASE_RESOLUTION_CODES = {
  RESOLVED_SATISFIED: "RESOLVED_SATISFIED",
  RESOLVED_WORKAROUND: "RESOLVED_WORKAROUND",
  UNABLE_TO_RESOLVE: "UNABLE_TO_RESOLVE",
  DUPLICATE: "DUPLICATE",
  WITHDRAWN: "WITHDRAWN",
  INFORMATION_PROVIDED: "INFORMATION_PROVIDED",
} as const;

export const CRM_CASE_ESCALATION_TRIGGERED_BY = {
  SYSTEM: "SYSTEM",
  MANUAL: "MANUAL",
} as const;

export const CRM_CASE_SLA_PAUSE_REASON_CODES = {
  PENDING_CUSTOMER: "PENDING_CUSTOMER",
  LEGAL_HOLD: "LEGAL_HOLD",
  AWAITING_THIRD_PARTY: "AWAITING_THIRD_PARTY",
} as const;

export type CrmCaseSlaPauseReasonCode =
  (typeof CRM_CASE_SLA_PAUSE_REASON_CODES)[keyof typeof CRM_CASE_SLA_PAUSE_REASON_CODES];

export const CRM_CASE_ENTITY_TYPE_CODES = {
  PARTY: "PARTY",
  CRM_RECORD: "CRM_RECORD",
  ACCOUNT: "ACCOUNT",
  LEAD: "LEAD",
  OPPORTUNITY: "OPPORTUNITY",
  CASE: "CASE",
  CONTACT: "CONTACT",
  COMMUNICATION: "COMMUNICATION",
  VISIT: "VISIT",
} as const;

export const CRM_CASE_LIST_VIEWS = {
  MY: "MY",
  QUEUE: "QUEUE",
  OVERDUE: "OVERDUE",
  ESCALATED: "ESCALATED",
  ALL: "ALL",
} as const;

export type CrmCaseListView =
  (typeof CRM_CASE_LIST_VIEWS)[keyof typeof CRM_CASE_LIST_VIEWS];

export const CRM_CASE_NUMBER_PREFIX = "CSE";

export const CRM_CASE_TYPE_LABELS: Record<CrmCaseTypeCode, string> = {
  ENQUIRY: "Enquiry",
  COMPLAINT: "Complaint",
  FEEDBACK: "Feedback",
  SERVICE_REQUEST: "Service Request",
  QUERY: "Query",
  INCIDENT: "Incident",
  INVESTIGATION: "Investigation",
  FOLLOW_UP: "Follow-up",
};

export const CRM_CASE_STATUS_LABELS: Record<CrmCaseStatusCode, string> = {
  NEW: "New",
  OPEN: "Open",
  PENDING_CUSTOMER: "Pending Customer",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const CRM_CASE_PRIORITY_LABELS: Record<CrmCasePriorityCode, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const CRM_CASE_SEVERITY_LABELS: Record<CrmCaseSeverityCode, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const CRM_CASE_OPEN_STATUS_CODES: CrmCaseStatusCode[] = [
  CRM_CASE_STATUS_CODES.NEW,
  CRM_CASE_STATUS_CODES.OPEN,
  CRM_CASE_STATUS_CODES.PENDING_CUSTOMER,
  CRM_CASE_STATUS_CODES.ESCALATED,
];

export const CRM_CASE_BUSINESS_RULES = {
  BRU_UNIQUE_NUMBER: "Case number unique within business.",
  BRU_CLOSED_READONLY: "Closed cases are read-only except governed reopen.",
  BRU_SLA_BREACH_ESCALATE: "SLA breach triggers escalation per configuration.",
  BRU_RESOLUTION_REQUIRED: "Resolution requires summary and resolution code.",
  BRU_ESCALATION_NOTIFY: "Escalated cases notify configured supervisor role.",
  BRU_HIGH_SEVERITY_OWNER: "High-severity cases may require immediate owner assignment.",
  BRU_REASSIGN_SEGMENT:
    "Case reassignment stops current assignee SLA segment and starts a new segment (ENG-003n).",
  BRU_TOTAL_SLA:
    "Total case SLA equals cumulative handler time excluding configured pause periods.",
} as const;

/**
 * Case SLA single source of truth — IP-09 consumes IP-13 policy tables;
 * ENG-003n remains the future authoritative engine (no competing permanent engine).
 */
export const CRM_CASE_SLA_ARCHITECTURE = {
  authoritativeEngine: "ENG-003n (future)",
  policyAdmin: "IP-13 crm_sla_policy (config source when present)",
  v1InterimClock:
    "crm_case due/pause/breach fields computed at create",
  resolutionOrder:
    "1) crm_sla_policy for CASE+priority 2) fallback crm_case_priority hours",
  migrationPath:
    "fields map to ENG-003n segments later; no competing permanent engine",
  deferred:
    "business-hours clocks, per-assignee segments, remainingMs computed by ENG-003n, ENG-009 notify",
} as const;

/**
 * Escalation architecture — ENG-009 contract for notify consumers.
 * Events CASE_ESCALATED + breach fields available; history in crm_case_escalation.
 */
export const CRM_CASE_ESCALATION_ARCHITECTURE = {
  workflowEngine: "ENG-005",
  notificationEngine: "ENG-009",
  eng009Contract:
    "events CASE_ESCALATED + breach fields (slaBreachedAt, escalationLevel) available for notify consumers; history in crm_case_escalation",
  pattern:
    "escalateCase → crm_case_escalation history → ENG-009.notify(supervisor) → reopenCase via ENG-005 gate (local stub v1)",
} as const;
