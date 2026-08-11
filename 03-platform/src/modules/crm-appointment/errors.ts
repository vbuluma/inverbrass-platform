/**
 * Domain errors for BP-004 / IP-06 Calendar & Appointment Management.
 */

export const CRM_APPOINTMENT_USER_MESSAGES = {
  INVALID_INPUT: "Please check the appointment details and try again.",
  NOT_FOUND: "Appointment was not found or you do not have access.",
  PARTY_REQUIRED: "Select a customer or party for this appointment.",
  ENTITY_LINK_REQUIRED: "Link at least one customer or CRM entity.",
  TERMINAL_READ_ONLY: "Completed or cancelled appointments cannot be edited.",
  OWNER_REQUIRED: "Assign an appointment owner.",
  SESSION_REQUIRED: "Your session has expired. Please sign in again.",
  INACTIVE_OWNER: "Cannot assign an inactive employee as appointment owner.",
  END_BEFORE_START: "End time must be after start time.",
  INVALID_CATALOGUE_CODE: "Selected value is not in the appointment catalogue.",
  BUSINESS_CONTEXT_REQUIRED: "Select a business before managing appointments.",
  ALREADY_TERMINAL: "This appointment is already closed.",
  OUTCOME_REQUIRED: "Provide outcome notes when completing the appointment.",
  SCHEDULING_CONFLICT: "The selected time conflicts with another appointment.",
} as const;

export class CrmAppointmentError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number = 400,
    readonly field?: string
  ) {
    super(message);
    this.name = "CrmAppointmentError";
  }
}
