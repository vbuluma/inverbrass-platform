/**
 * Domain constants for BP-004 / IP-13 CRM Governance & Administration.
 *
 * Architecture note:
 * Governance is keyed by party_id (Customer Profile subject). IP-01 will later
 * add crm_record_id; do not implement CRM Core here.
 */

export const CRM_GOVERNANCE_STATUS_CODES = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  READY: "READY",
  ON_HOLD: "ON_HOLD",
  NON_COMPLIANT: "NON_COMPLIANT",
  ARCHIVED: "ARCHIVED",
} as const;

export type CrmGovernanceStatusCode =
  (typeof CRM_GOVERNANCE_STATUS_CODES)[keyof typeof CRM_GOVERNANCE_STATUS_CODES];

export const CRM_GOVERNANCE_CHECKLIST_STATUSES = {
  COMPLETED: "COMPLETED",
  INCOMPLETE: "INCOMPLETE",
  WARNING: "WARNING",
} as const;

export type CrmGovernanceChecklistStatus =
  (typeof CRM_GOVERNANCE_CHECKLIST_STATUSES)[keyof typeof CRM_GOVERNANCE_CHECKLIST_STATUSES];

export const CRM_GOVERNANCE_CHANGE_TYPES = {
  OWNER_CHANGED: "OWNER_CHANGED",
  RELATIONSHIP_MANAGER_CHANGED: "RELATIONSHIP_MANAGER_CHANGED",
  STEWARD_CHANGED: "STEWARD_CHANGED",
  STATUS_CHANGED: "STATUS_CHANGED",
  READINESS_CHANGED: "READINESS_CHANGED",
  VALIDATION_EXECUTED: "VALIDATION_EXECUTED",
  LOCK_CHANGED: "LOCK_CHANGED",
  NOTES_CHANGED: "NOTES_CHANGED",
} as const;

export const CRM_GOVERNANCE_OWNERSHIP_ROLES = {
  OWNER: "OWNER",
  RELATIONSHIP_MANAGER: "RELATIONSHIP_MANAGER",
  STEWARD: "STEWARD",
} as const;

export type CrmGovernanceOwnershipRole =
  (typeof CRM_GOVERNANCE_OWNERSHIP_ROLES)[keyof typeof CRM_GOVERNANCE_OWNERSHIP_ROLES];

export const CRM_MERGE_PROPOSAL_STATUSES = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXECUTED: "EXECUTED",
  CANCELLED: "CANCELLED",
} as const;

export type CrmMergeProposalStatus =
  (typeof CRM_MERGE_PROPOSAL_STATUSES)[keyof typeof CRM_MERGE_PROPOSAL_STATUSES];

export const CRM_SLA_ENTITY_TYPE_CODES = {
  CASE: "CASE",
  VISIT_REPORT: "VISIT_REPORT",
  ACTIVITY: "ACTIVITY",
  APPOINTMENT: "APPOINTMENT",
} as const;

export type CrmSlaEntityTypeCode =
  (typeof CRM_SLA_ENTITY_TYPE_CODES)[keyof typeof CRM_SLA_ENTITY_TYPE_CODES];

export const CRM_APPROVAL_ACTION_CODES = {
  MERGE: "MERGE",
  ACTIVATION: "ACTIVATION",
  REOPEN_CASE: "REOPEN_CASE",
  ARCHIVE: "ARCHIVE",
} as const;

/** Activation readiness threshold (percentage). */
export const CRM_GOVERNANCE_ACTIVATION_THRESHOLD = 80;

export const CRM_GOVERNANCE_LOW_SCORE_THRESHOLD = 50;

/** ENG-003l checklist architecture stub — local foundation tables only. */
export const CRM_GOVERNANCE_CHECKLIST_ARCHITECTURE = {
  engine: "ENG-003l",
  pattern:
    "crm_governance_checklist_definition → evaluateChecklistItem → readiness_score → activation_blocked",
  note: "No platform ENG-003l engine build; local foundation mirrors offering governance.",
} as const;

/** ENG-003n SLA administration architecture stub. */
export const CRM_GOVERNANCE_SLA_ARCHITECTURE = {
  engine: "ENG-003n",
  pattern:
    "crm_sla_policy + crm_business_hours + crm_holiday_calendar → consumed by IP-05/06/07/09",
  note: "Local admin stubs only; entity IPs retain due-date computation until ENG-003n ships.",
} as const;

/** ENG-005 merge / activation approval architecture stub. */
export const CRM_GOVERNANCE_WORKFLOW_ARCHITECTURE = {
  engine: "ENG-005",
  pattern:
    "detectDuplicates → crm_merge_proposal PENDING → approve/reject → executeMerge stub (no party delete; BP-002 owns merge)",
  note: "Local queue + approval matrix; party merge remains BP-002.",
} as const;

export const CRM_GOVERNANCE_KEYING_ARCHITECTURE = {
  subject: "party_id",
  future: "crm_record_id (IP-01 CRM Core)",
  note: "Do not implement crm_record in Service Engagement IP-13.",
} as const;
