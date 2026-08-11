/**
 * Default CRM Appointment metadata catalogue rows.
 * BP-004 / IP-06
 */

export const crmAppointmentTypes = [
  {
    code: "SALES_VISIT",
    name: "Sales Visit",
    defaultDurationMinutes: 60,
    displayOrder: 10,
  },
  {
    code: "DEMO",
    name: "Demo",
    defaultDurationMinutes: 45,
    displayOrder: 20,
  },
  {
    code: "SERVICE_CALL",
    name: "Service Call",
    defaultDurationMinutes: 60,
    displayOrder: 30,
  },
  {
    code: "MEETING",
    name: "Meeting",
    defaultDurationMinutes: 30,
    displayOrder: 40,
  },
  {
    code: "OTHER",
    name: "Other",
    defaultDurationMinutes: 60,
    displayOrder: 90,
  },
] as const;

export const crmAppointmentStatuses = [
  {
    code: "SCHEDULED",
    name: "Scheduled",
    isTerminal: false,
    isEditable: true,
    displayOrder: 10,
  },
  {
    code: "HELD",
    name: "Held",
    isTerminal: false,
    isEditable: true,
    displayOrder: 15,
  },
  {
    code: "RESCHEDULED",
    name: "Rescheduled",
    isTerminal: false,
    isEditable: true,
    displayOrder: 18,
  },
  {
    code: "COMPLETED",
    name: "Completed",
    isTerminal: true,
    isEditable: false,
    displayOrder: 20,
  },
  {
    code: "PARTIALLY_COMPLETED",
    name: "Partially Completed",
    isTerminal: true,
    isEditable: false,
    displayOrder: 25,
  },
  {
    code: "CANCELLED",
    name: "Cancelled",
    isTerminal: true,
    isEditable: false,
    displayOrder: 30,
  },
  {
    code: "DECLINED",
    name: "Declined",
    isTerminal: true,
    isEditable: false,
    displayOrder: 35,
  },
  {
    code: "NO_SHOW",
    name: "No-show",
    isTerminal: true,
    isEditable: false,
    displayOrder: 40,
  },
] as const;

export const crmAppointmentParticipantResponseStatuses = [
  { code: "INVITED", name: "Invited" },
  { code: "ACCEPTED", name: "Accepted" },
  { code: "DECLINED", name: "Declined" },
  { code: "TENTATIVE", name: "Tentative" },
] as const;
