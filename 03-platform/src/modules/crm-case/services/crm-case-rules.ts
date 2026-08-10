import {
  CRM_CASE_NUMBER_PREFIX,
  CRM_CASE_OPEN_STATUS_CODES,
  CRM_CASE_STATUS_CODES,
  type CrmCaseStatusCode,
} from "@/modules/crm-case/constants";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  [CRM_CASE_STATUS_CODES.NEW]: [
    CRM_CASE_STATUS_CODES.OPEN,
    CRM_CASE_STATUS_CODES.PENDING_CUSTOMER,
    CRM_CASE_STATUS_CODES.ESCALATED,
    CRM_CASE_STATUS_CODES.RESOLVED,
  ],
  [CRM_CASE_STATUS_CODES.OPEN]: [
    CRM_CASE_STATUS_CODES.PENDING_CUSTOMER,
    CRM_CASE_STATUS_CODES.ESCALATED,
    CRM_CASE_STATUS_CODES.RESOLVED,
  ],
  [CRM_CASE_STATUS_CODES.PENDING_CUSTOMER]: [
    CRM_CASE_STATUS_CODES.OPEN,
    CRM_CASE_STATUS_CODES.ESCALATED,
    CRM_CASE_STATUS_CODES.RESOLVED,
  ],
  [CRM_CASE_STATUS_CODES.ESCALATED]: [
    CRM_CASE_STATUS_CODES.OPEN,
    CRM_CASE_STATUS_CODES.PENDING_CUSTOMER,
    CRM_CASE_STATUS_CODES.RESOLVED,
  ],
  [CRM_CASE_STATUS_CODES.RESOLVED]: [CRM_CASE_STATUS_CODES.CLOSED],
  [CRM_CASE_STATUS_CODES.CLOSED]: [CRM_CASE_STATUS_CODES.OPEN],
};

export function buildCaseNumber(sequence: number): string {
  return `${CRM_CASE_NUMBER_PREFIX}-${String(sequence).padStart(6, "0")}`;
}

export function assertTransition(
  fromStatus: string,
  toStatus: string
): boolean {
  const allowed = ALLOWED_TRANSITIONS[fromStatus] ?? [];
  return allowed.includes(toStatus);
}

export function isSlaPausedStatus(statusCode: string): boolean {
  return statusCode === CRM_CASE_STATUS_CODES.PENDING_CUSTOMER;
}

export function isCaseEditable(statusCode: string): boolean {
  return statusCode !== CRM_CASE_STATUS_CODES.CLOSED;
}

export function isOpenCaseStatus(statusCode: string): boolean {
  return CRM_CASE_OPEN_STATUS_CODES.includes(statusCode as CrmCaseStatusCode);
}

export function computeSlaDueDates(
  openedAt: Date,
  firstResponseTargetHours: number,
  resolutionTargetHours: number
): { slaFirstResponseDueAt: Date; slaResolutionDueAt: Date } {
  const hourMs = 60 * 60_000;
  return {
    slaFirstResponseDueAt: new Date(
      openedAt.getTime() + firstResponseTargetHours * hourMs
    ),
    slaResolutionDueAt: new Date(
      openedAt.getTime() + resolutionTargetHours * hourMs
    ),
  };
}

/** Remaining ms until due; when paused, freeze remaining at pause instant. */
export function computeSlaRemainingMs(
  dueAt: Date | null | undefined,
  pausedAt: Date | null | undefined,
  now: Date = new Date()
): number | null {
  if (!dueAt) return null;
  const reference = pausedAt ?? now;
  return dueAt.getTime() - reference.getTime();
}

/**
 * At-risk when remaining > 0 and remaining ≤ 4 hours.
 * (Simple v1; thresholdRatio reserved for ENG-003n.)
 */
export function isSlaAtRisk(
  dueAt: Date | null | undefined,
  pausedAt: Date | null | undefined,
  now: Date = new Date(),
  _thresholdRatio = 0.2
): boolean {
  const remaining = computeSlaRemainingMs(dueAt, pausedAt, now);
  if (remaining === null) return false;
  const fourHoursMs = 4 * 60 * 60_000;
  return remaining > 0 && remaining <= fourHoursMs;
}

export function isSlaBreached(
  dueAt: Date | null | undefined,
  breachedAt: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (breachedAt) return true;
  if (!dueAt) return false;
  return now.getTime() > dueAt.getTime();
}

export function isOverdue(input: {
  statusCode: string;
  slaResolutionDueAt: Date | null;
  slaPausedAt: Date | null;
  now?: Date;
}): boolean {
  if (!isOpenCaseStatus(input.statusCode)) return false;
  if (isSlaPausedStatus(input.statusCode) || input.slaPausedAt) return false;
  if (!input.slaResolutionDueAt) return false;
  const now = input.now ?? new Date();
  return now.getTime() > input.slaResolutionDueAt.getTime();
}
