/**
 * Domain constants for BP-004 / IP-07 Visit & Call Report Management.
 */

export const CRM_VISIT_TYPE_CODES = {
  SALES: "SALES",
  SITE_AUDIT: "SITE_AUDIT",
  EXECUTIVE: "EXECUTIVE",
  COMPLAINT: "COMPLAINT",
  TECHNICAL: "TECHNICAL",
  INSPECTION: "INSPECTION",
  RELATIONSHIP: "RELATIONSHIP",
  FOLLOW_UP: "FOLLOW_UP",
  VIRTUAL: "VIRTUAL",
  PHONE: "PHONE",
} as const;

export type CrmVisitTypeCode =
  (typeof CRM_VISIT_TYPE_CODES)[keyof typeof CRM_VISIT_TYPE_CODES];

export const CRM_VISIT_STATUS_CODES = {
  DRAFT: "DRAFT",
  IN_PROGRESS: "IN_PROGRESS",
  SUBMITTED: "SUBMITTED",
  RETURNED: "RETURNED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;

export type CrmVisitStatusCode =
  (typeof CRM_VISIT_STATUS_CODES)[keyof typeof CRM_VISIT_STATUS_CODES];

export const CRM_VISIT_ACTION_ITEM_STATUS_CODES = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export const CRM_VISIT_ENTITY_TYPE_CODES = {
  PARTY: "PARTY",
  CRM_RECORD: "CRM_RECORD",
  ACCOUNT: "ACCOUNT",
  LEAD: "LEAD",
  OPPORTUNITY: "OPPORTUNITY",
  CASE: "CASE",
  CONTACT: "CONTACT",
} as const;

export const CRM_VISIT_LIST_VIEWS = {
  MY: "MY",
  TEAM: "TEAM",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  ALL: "ALL",
} as const;

export type CrmVisitListView =
  (typeof CRM_VISIT_LIST_VIEWS)[keyof typeof CRM_VISIT_LIST_VIEWS];

export const CRM_VISIT_NUMBER_PREFIX = "VST";

export const CRM_VISIT_TYPE_LABELS: Record<CrmVisitTypeCode, string> = {
  SALES: "Sales Visit",
  SITE_AUDIT: "Site Audit",
  EXECUTIVE: "Executive Call",
  COMPLAINT: "Complaint Visit",
  TECHNICAL: "Technical Visit",
  INSPECTION: "Inspection",
  RELATIONSHIP: "Relationship Visit",
  FOLLOW_UP: "Follow-up Visit",
  VIRTUAL: "Virtual Visit",
  PHONE: "Phone Call Report",
};

export const CRM_VISIT_STATUS_LABELS: Record<CrmVisitStatusCode, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  RETURNED: "Returned",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const CRM_VISIT_BUSINESS_RULES = {
  BRU_APPROVED_READ_ONLY: "Approved reports are read-only except authorised addenda.",
  BRU_ENTITY_LINK_REQUIRED: "Every visit must link to at least one Party or CRM entity.",
  BRU_ACTION_OWNER_DUE: "Action items require owner and due date before submit.",
  BRU_REVIEWER_COMMENTS: "Return and reject require reviewer comments.",
  BRU_ONE_RECORD: "One visit record per engagement — participants collaborate.",
  BRU_APPOINTMENT_LINK:
    "Visit may optionally reference an IP-06 appointment via linkedAppointmentId (Visit → Appointment). Ownership is not bidirectional.",
} as const;

/** ENG-003n SLA stub — report due after visit completion. */
export const CRM_VISIT_SLA_ARCHITECTURE = {
  pattern:
    "onVisitCompleted → open ENG-003n segment (report due) → remind/escalate via ENG-005/ENG-009",
  defaultReportDueHours: 24,
} as const;

/** ENG-005 approval workflow stub until engine ships. */
export const CRM_VISIT_APPROVAL_ARCHITECTURE = {
  stages: ["AUTHOR", "SUPERVISOR", "MANAGER"] as const,
  pattern: "submit → reviewer assignment → approve|return|reject (local state machine v1)",
} as const;

/** ENG-015 document attachment — deferred until storage integration. */
export const CRM_VISIT_DOCUMENT_ARCHITECTURE = {
  status: "DEFERRED",
  note: "Schema crm_visit_document exists; upload/create not wired in v1. ENG-015 owns storage. Document association deferred until ENG-015 integration.",
  pattern: "crm_visit_document.storageKey → ENG-015 / shared storage provider",
} as const;
