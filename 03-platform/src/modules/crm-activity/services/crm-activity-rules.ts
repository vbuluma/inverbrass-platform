/**
 * Business rules for BP-004 / IP-05 Activity & Task Management.
 */

import {
  CRM_ACTIVITY_OPEN_STATUS_CODES,
  CRM_ACTIVITY_OUTCOME_CODES,
  CRM_ACTIVITY_STATUS_CODES,
  CRM_ACTIVITY_TERMINAL_STATUS_CODES,
  type CrmActivityStatusCode,
} from "@/modules/crm-activity/constants";

export function isOpenActivityStatus(statusCode: string): boolean {
  return (CRM_ACTIVITY_OPEN_STATUS_CODES as string[]).includes(statusCode);
}

export function isTerminalActivityStatus(statusCode: string): boolean {
  return (CRM_ACTIVITY_TERMINAL_STATUS_CODES as string[]).includes(statusCode);
}

export function isActivityEditable(statusCode: string): boolean {
  return isOpenActivityStatus(statusCode);
}

export function isActivityOverdue(
  statusCode: string,
  dueDate: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!dueDate) return false;
  if (isTerminalActivityStatus(statusCode)) return false;
  return dueDate.getTime() < now.getTime();
}

export function canCompleteActivity(statusCode: string): boolean {
  return isOpenActivityStatus(statusCode);
}

export function canCancelActivity(statusCode: string): boolean {
  return isOpenActivityStatus(statusCode);
}

export function canDeferActivity(statusCode: string): boolean {
  return (
    statusCode === CRM_ACTIVITY_STATUS_CODES.PLANNED ||
    statusCode === CRM_ACTIVITY_STATUS_CODES.ASSIGNED ||
    statusCode === CRM_ACTIVITY_STATUS_CODES.IN_PROGRESS ||
    statusCode === CRM_ACTIVITY_STATUS_CODES.WAITING
  );
}

export function resolveDefaultPriority(): string {
  return "NORMAL";
}

export function resolveInitialStatus(hasOwner: boolean): CrmActivityStatusCode {
  return hasOwner
    ? CRM_ACTIVITY_STATUS_CODES.ASSIGNED
    : CRM_ACTIVITY_STATUS_CODES.PLANNED;
}

export function recordSourceLabel(code: string): string {
  return code.replaceAll("_", " ");
}

export function buildActivityNumber(sequence: number): string {
  return `ACT-${String(sequence).padStart(6, "0")}`;
}

export function validateScheduledWindow(
  scheduledStart?: Date | null,
  scheduledEnd?: Date | null
): string | null {
  if (scheduledStart && scheduledEnd && scheduledEnd <= scheduledStart) {
    return "End time must be after start time.";
  }
  return null;
}

export function resolveActivityDate(
  scheduledStart?: Date | null,
  createdAt?: Date | null
): Date {
  return scheduledStart ?? createdAt ?? new Date();
}

/** BRU: Due date cannot precede activity date. */
export function validateDueDateAfterActivityDate(
  dueDate: Date | null | undefined,
  activityDate: Date
): string | null {
  if (!dueDate) return null;
  if (dueDate.getTime() < activityDate.getTime()) {
    return "Due date cannot precede the activity date.";
  }
  return null;
}

export function hasEntityLinkRequirement(
  primaryPartyId: string | null | undefined,
  entityLinks: Array<{ entityTypeCode: string; entityId: string }> | undefined
): boolean {
  if (primaryPartyId) return true;
  return (entityLinks?.length ?? 0) > 0;
}

/** BRU: Mandatory completion notes for flagged types or overdue completion. */
export function validateCompletionNotes(input: {
  outcomeNotes?: string | null;
  requiresTypeNotes: boolean;
  isOverdue: boolean;
  outcomeCode?: string | null;
}): string | null {
  const notes = input.outcomeNotes?.trim() ?? "";
  const outcomeRequiresNotes =
    input.outcomeCode === CRM_ACTIVITY_OUTCOME_CODES.OTHER ||
    input.outcomeCode === CRM_ACTIVITY_OUTCOME_CODES.FOLLOW_UP_REQUIRED;

  if (input.requiresTypeNotes && !notes) {
    return "Completion notes are required for this activity type.";
  }

  if (input.isOverdue && !notes) {
    return "Overdue activities require completion notes when marked complete.";
  }

  if (outcomeRequiresNotes && !notes) {
    return "Completion notes are required for the selected outcome.";
  }

  return null;
}

export function normalizeLegacyStatusCode(statusCode: string): string {
  return statusCode === "OPEN" ? CRM_ACTIVITY_STATUS_CODES.ASSIGNED : statusCode;
}
