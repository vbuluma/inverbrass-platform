/**
 * Domain constants for BP-004 / IP-06 Calendar & Appointment Management.
 */

export const CRM_APPOINTMENT_TYPE_CODES = {
  SALES_VISIT: "SALES_VISIT",
  DEMO: "DEMO",
  SERVICE_CALL: "SERVICE_CALL",
  MEETING: "MEETING",
  OTHER: "OTHER",
} as const;

export type CrmAppointmentTypeCode =
  (typeof CRM_APPOINTMENT_TYPE_CODES)[keyof typeof CRM_APPOINTMENT_TYPE_CODES];

export const CRM_APPOINTMENT_STATUS_CODES = {
  SCHEDULED: "SCHEDULED",
  HELD: "HELD",
  COMPLETED: "COMPLETED",
  PARTIALLY_COMPLETED: "PARTIALLY_COMPLETED",
  RESCHEDULED: "RESCHEDULED",
  CANCELLED: "CANCELLED",
  DECLINED: "DECLINED",
  NO_SHOW: "NO_SHOW",
} as const;

export type CrmAppointmentStatusCode =
  (typeof CRM_APPOINTMENT_STATUS_CODES)[keyof typeof CRM_APPOINTMENT_STATUS_CODES];

export const CRM_APPOINTMENT_OPEN_STATUS_CODES: CrmAppointmentStatusCode[] = [
  CRM_APPOINTMENT_STATUS_CODES.SCHEDULED,
];

export const CRM_APPOINTMENT_TERMINAL_STATUS_CODES: CrmAppointmentStatusCode[] = [
  CRM_APPOINTMENT_STATUS_CODES.COMPLETED,
  CRM_APPOINTMENT_STATUS_CODES.PARTIALLY_COMPLETED,
  CRM_APPOINTMENT_STATUS_CODES.CANCELLED,
  CRM_APPOINTMENT_STATUS_CODES.DECLINED,
  CRM_APPOINTMENT_STATUS_CODES.NO_SHOW,
];

export const CRM_APPOINTMENT_PARTICIPANT_KINDS = {
  INTERNAL: "INTERNAL",
  EXTERNAL: "EXTERNAL",
} as const;

export type CrmAppointmentParticipantKind =
  (typeof CRM_APPOINTMENT_PARTICIPANT_KINDS)[keyof typeof CRM_APPOINTMENT_PARTICIPANT_KINDS];

export const CRM_APPOINTMENT_RESPONSE_STATUS_CODES = {
  INVITED: "INVITED",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  TENTATIVE: "TENTATIVE",
} as const;

export const CRM_APPOINTMENT_ENTITY_TYPE_CODES = {
  PARTY: "PARTY",
  CRM_RECORD: "CRM_RECORD",
  ACCOUNT: "ACCOUNT",
  LEAD: "LEAD",
  OPPORTUNITY: "OPPORTUNITY",
  CASE: "CASE",
  CONTACT: "CONTACT",
} as const;

export type CrmAppointmentEntityTypeCode =
  (typeof CRM_APPOINTMENT_ENTITY_TYPE_CODES)[keyof typeof CRM_APPOINTMENT_ENTITY_TYPE_CODES];

export const CRM_APPOINTMENT_ENTITY_TYPE_LABELS: Record<
  CrmAppointmentEntityTypeCode,
  string
> = {
  PARTY: "Party",
  CRM_RECORD: "CRM Record",
  ACCOUNT: "Account",
  LEAD: "Lead",
  OPPORTUNITY: "Opportunity",
  CASE: "Case",
  CONTACT: "Contact",
};

export const CRM_APPOINTMENT_LIST_VIEWS = {
  MY: "MY",
  TEAM: "TEAM",
  UPCOMING: "UPCOMING",
  ALL: "ALL",
  CALENDAR: "CALENDAR",
} as const;

export type CrmAppointmentListView =
  (typeof CRM_APPOINTMENT_LIST_VIEWS)[keyof typeof CRM_APPOINTMENT_LIST_VIEWS];

export const CRM_APPOINTMENT_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", available: true },
  { id: "participants", label: "Participants", available: true },
  { id: "audit-history", label: "Audit History", available: true },
] as const;

export const CRM_APPOINTMENT_NUMBER_PREFIX = "APT";

export const CRM_APPOINTMENT_TYPE_LABELS: Record<CrmAppointmentTypeCode, string> = {
  SALES_VISIT: "Sales Visit",
  DEMO: "Demo",
  SERVICE_CALL: "Service Call",
  MEETING: "Meeting",
  OTHER: "Other",
};

export const CRM_APPOINTMENT_STATUS_LABELS: Record<CrmAppointmentStatusCode, string> = {
  SCHEDULED: "Scheduled",
  HELD: "Held",
  COMPLETED: "Completed",
  PARTIALLY_COMPLETED: "Partially Completed",
  RESCHEDULED: "Rescheduled",
  CANCELLED: "Cancelled",
  DECLINED: "Declined",
  NO_SHOW: "No-show",
};

/** Documented business rules — enforced in crm-appointment-rules.ts */
export const CRM_APPOINTMENT_BUSINESS_RULES = {
  BRU_END_AFTER_START: "End time must be after start time.",
  BRU_CANCELLED_HISTORY: "Cancelled appointments retain history; no hard delete.",
  BRU_EXTERNAL_CONTACT: "External participants must be BP-002 party contacts.",
  BRU_COMPLETE_ACTIVITY: "Completed appointments link to a completed IP-05 activity.",
  BRU_VISIBILITY: "Users see appointments they own or participate in unless team view.",
  BRU_TERMINAL_READ_ONLY: "Terminal appointments are read-only.",
  BRU_CONFLICT_WARNING: "Overlapping owner appointments raise conflict warnings.",
} as const;

/** ENG-009 reminder stub — audit log until notification engine integrated. */
export const CRM_APPOINTMENT_REMINDER_ARCHITECTURE = {
  pattern: "scheduleReminder(appointmentId, intervals[]) → ENG-009 or audit fallback",
  defaultIntervalsMinutes: [1440, 60] as const,
} as const;

/**
 * Recurring appointments (future — not implemented in v1).
 *
 * Appointment → Recurrence Rule → Occurrences
 */
export const CRM_APPOINTMENT_RECURRENCE_ARCHITECTURE = {
  entities: [
    "crm_appointment_recurrence_rule",
    "crm_appointment (occurrence rows with recurrenceRuleId + occurrenceIndex)",
  ] as const,
  ruleFields: [
    "frequency (DAILY|WEEKLY|MONTHLY)",
    "interval",
    "byWeekDay",
    "untilDate / count",
    "timezone",
  ] as const,
  pattern:
    "CrmAppointmentRecurrenceService.expand(rule) → insertMany(occurrences) → single seriesId",
} as const;

/**
 * Resource scheduling (future — not implemented in v1).
 * People scheduling ships in v1; rooms/vehicles/equipment reserved here.
 */
export const CRM_APPOINTMENT_RESOURCE_ARCHITECTURE = {
  resourceTypes: ["MEETING_ROOM", "VEHICLE", "EQUIPMENT", "BRANCH_OFFICE"] as const,
  entities: ["crm_appointment_resource", "crm_resource_catalogue"] as const,
  pattern:
    "CrmAppointmentResourcePort.reserve(appointmentId, resourceId, start, end) → conflict check",
} as const;

/**
 * External calendar integration (future — extension points only).
 */
export const CRM_APPOINTMENT_EXTERNAL_CALENDAR_ARCHITECTURE = {
  providers: ["OUTLOOK", "GOOGLE", "ICS"] as const,
  ports: [
    "CrmAppointmentExternalCalendarPort.syncOut(appointment)",
    "CrmAppointmentExternalCalendarPort.syncIn(externalEvent)",
    "CrmAppointmentExternalCalendarPort.exportIcs(appointmentIds)",
    "CrmAppointmentExternalCalendarPort.importIcs(payload)",
  ] as const,
  fields: ["externalCalendarSyncKey"] as const,
} as const;

/**
 * Lightweight meeting minutes (IP-06) vs full visit reports (IP-07).
 *
 * Appointment → Notes → Decisions → Action Items Summary → Timeline
 */
export const CRM_APPOINTMENT_MINUTES_ARCHITECTURE = {
  fields: ["meetingNotes", "decisions", "actionItemsSummary"] as const,
  boundary:
    "IP-06 owns lightweight notes; IP-07 owns collaborative sections, approval, and SLA.",
} as const;
