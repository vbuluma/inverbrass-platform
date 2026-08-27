/**
 * Purpose:
 * ENG-003n — Work Assignment & SLA Engine constants.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation (consumption contract)
 */

export const WORK_SUBJECT_TYPES = {
  CRM_RECORD: "crm_record",
  CRM_LEAD: "crm_lead",
  CRM_OPPORTUNITY: "crm_opportunity",
  CRM_ACCOUNT: "crm_account",
} as const;

export type WorkSubjectType =
  (typeof WORK_SUBJECT_TYPES)[keyof typeof WORK_SUBJECT_TYPES];

export const WORK_OWNER_TYPES = {
  USER: "USER",
  PARTY: "PARTY",
  TEAM: "TEAM",
  QUEUE: "QUEUE",
} as const;

export type WorkOwnerType =
  (typeof WORK_OWNER_TYPES)[keyof typeof WORK_OWNER_TYPES];

export const WORK_ASSIGNMENT_TYPES = {
  MANUAL: "MANUAL",
  AUTOMATIC: "AUTOMATIC",
  ESCALATION: "ESCALATION",
  QUEUE_PULL: "QUEUE_PULL",
} as const;

export type WorkAssignmentType =
  (typeof WORK_ASSIGNMENT_TYPES)[keyof typeof WORK_ASSIGNMENT_TYPES];

export const WORK_SLA_CLOCK_MODES = {
  CALENDAR: "CALENDAR",
  BUSINESS_HOURS: "BUSINESS_HOURS",
} as const;

export type WorkSlaClockMode =
  (typeof WORK_SLA_CLOCK_MODES)[keyof typeof WORK_SLA_CLOCK_MODES];

export const DEFAULT_CRM_RECORD_SLA_SECONDS = 7 * 24 * 60 * 60;
