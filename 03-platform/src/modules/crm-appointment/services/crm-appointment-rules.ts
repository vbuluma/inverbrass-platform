/**
 * Business rules for BP-004 / IP-06 Calendar & Appointment Management.
 */

import {
  CRM_APPOINTMENT_NUMBER_PREFIX,
  CRM_APPOINTMENT_STATUS_CODES,
  CRM_APPOINTMENT_TERMINAL_STATUS_CODES,
  type CrmAppointmentStatusCode,
} from "@/modules/crm-appointment/constants";

export function buildAppointmentNumber(sequence: number): string {
  return `${CRM_APPOINTMENT_NUMBER_PREFIX}-${String(sequence).padStart(6, "0")}`;
}

export function validateEndAfterStart(start: Date, end: Date): string | null {
  if (end.getTime() <= start.getTime()) {
    return "End time must be after start time.";
  }
  return null;
}

export function isTerminalAppointmentStatus(statusCode: string): boolean {
  return CRM_APPOINTMENT_TERMINAL_STATUS_CODES.includes(
    statusCode as CrmAppointmentStatusCode
  );
}

export function isAppointmentEditable(statusCode: string): boolean {
  return !isTerminalAppointmentStatus(statusCode);
}

export function canCancelAppointment(statusCode: string): boolean {
  return statusCode === CRM_APPOINTMENT_STATUS_CODES.SCHEDULED;
}

export function canCompleteAppointment(statusCode: string): boolean {
  return (
    statusCode === CRM_APPOINTMENT_STATUS_CODES.SCHEDULED ||
    statusCode === CRM_APPOINTMENT_STATUS_CODES.HELD ||
    statusCode === CRM_APPOINTMENT_STATUS_CODES.RESCHEDULED
  );
}

export function canMarkNoShow(statusCode: string): boolean {
  return (
    statusCode === CRM_APPOINTMENT_STATUS_CODES.SCHEDULED ||
    statusCode === CRM_APPOINTMENT_STATUS_CODES.HELD
  );
}

/**
 * Suggest next free slot by shifting forward in 30-minute steps (simple v1).
 */
export function suggestAlternativeSlots(
  start: Date,
  durationMs: number,
  conflictingEnds: Date[],
  maxSuggestions = 3
): Array<{ start: Date; end: Date }> {
  const suggestions: Array<{ start: Date; end: Date }> = [];
  let candidateStart = new Date(start.getTime() + 30 * 60_000);

  while (suggestions.length < maxSuggestions) {
    const candidateEnd = new Date(candidateStart.getTime() + durationMs);
    const overlaps = conflictingEnds.some((end) => candidateStart < end);
    if (!overlaps) {
      suggestions.push({ start: new Date(candidateStart), end: candidateEnd });
    }
    candidateStart = new Date(candidateStart.getTime() + 30 * 60_000);
    if (suggestions.length === 0 && suggestions.length < maxSuggestions) {
      // keep scanning; guard against infinite loop
    }
    if (
      candidateStart.getTime() - start.getTime() >
      7 * 24 * 60 * 60_000
    ) {
      break;
    }
  }

  return suggestions;
}

export function hasEntityLinkRequirement(
  primaryPartyId: string,
  entityLinks?: Array<{ entityId: string }> | null
): boolean {
  if (primaryPartyId?.trim()) return true;
  return Boolean(entityLinks && entityLinks.length > 0);
}

export function resolveDefaultEndFromStart(
  start: Date,
  durationMinutes: number
): Date {
  return new Date(start.getTime() + durationMinutes * 60_000);
}

export function mapAppointmentTypeToActivityType(
  appointmentTypeCode: string
): string {
  switch (appointmentTypeCode) {
    case "SALES_VISIT":
    case "SERVICE_CALL":
      return "VISIT";
    case "DEMO":
    case "MEETING":
      return "MEETING";
    default:
      return "MEETING";
  }
}
