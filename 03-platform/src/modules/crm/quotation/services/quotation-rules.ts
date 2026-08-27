/**
 * Purpose:
 * Pure quotation lifecycle and status business-rule helpers (no I/O).
 *
 * Lifecycle model (IP-10):
 *   DRAFT → SENT → ACCEPTED | REJECTED | EXPIRED
 *   REJECTED | EXPIRED → DRAFT (revision / renewal only)
 *
 * Business rules:
 *   BRU-002 — Pricing locked once Sent unless revised
 *   BRU-003 — Expired quotations cannot convert to order
 *   BRU-005 — Versions immutable once Sent
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline
 */

import {
  CRM_TIMELINE_EVENT_TYPES,
  QUOTATION_LOCKED_STATUS_CODES,
  QUOTATION_STATUS_CODES,
  QUOTATION_TERMINAL_STATUS_CODES,
  type CrmQuotationTimelineEventType,
  type QuotationStatusCode,
} from "@/modules/crm/constants";

/** Allowed manual and system status transitions for quotation header and version. */
export const QUOTATION_STATUS_TRANSITIONS: Record<
  QuotationStatusCode,
  readonly QuotationStatusCode[]
> = {
  [QUOTATION_STATUS_CODES.DRAFT]: [QUOTATION_STATUS_CODES.SENT],
  [QUOTATION_STATUS_CODES.SENT]: [
    QUOTATION_STATUS_CODES.ACCEPTED,
    QUOTATION_STATUS_CODES.REJECTED,
    QUOTATION_STATUS_CODES.EXPIRED,
  ],
  [QUOTATION_STATUS_CODES.ACCEPTED]: [],
  [QUOTATION_STATUS_CODES.REJECTED]: [QUOTATION_STATUS_CODES.DRAFT],
  [QUOTATION_STATUS_CODES.EXPIRED]: [QUOTATION_STATUS_CODES.DRAFT],
};

export function canTransitionQuotationStatus(
  current: QuotationStatusCode,
  next: QuotationStatusCode
): boolean {
  if (current === next) {
    return true;
  }
  return QUOTATION_STATUS_TRANSITIONS[current].includes(next);
}

export function isQuotationTerminalStatus(
  status: QuotationStatusCode | string
): boolean {
  return (QUOTATION_TERMINAL_STATUS_CODES as readonly string[]).includes(status);
}

export function isQuotationLockedStatus(
  status: QuotationStatusCode | string
): boolean {
  return (QUOTATION_LOCKED_STATUS_CODES as readonly string[]).includes(status);
}

/** Draft quotations and draft versions allow line edits (BRU-002). */
export function isQuotationEditable(status: QuotationStatusCode | string): boolean {
  return status === QUOTATION_STATUS_CODES.DRAFT;
}

/** Sent+ versions are immutable (BRU-005). */
export function isQuotationVersionLocked(
  status: QuotationStatusCode | string
): boolean {
  return isQuotationLockedStatus(status);
}

export function isQuotationExpiredByDate(
  validUntil: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!validUntil) {
    return false;
  }
  const expiry =
    validUntil instanceof Date ? validUntil : new Date(validUntil);
  return expiry < now;
}

/**
 * Resolves effective status considering validity expiry.
 * A Sent quotation past validUntil is treated as Expired (BRU-003).
 */
export function resolveEffectiveQuotationStatus(
  status: QuotationStatusCode | string,
  validUntil: Date | string | null | undefined,
  now: Date = new Date()
): QuotationStatusCode | string {
  if (
    status === QUOTATION_STATUS_CODES.SENT &&
    isQuotationExpiredByDate(validUntil, now)
  ) {
    return QUOTATION_STATUS_CODES.EXPIRED;
  }
  return status;
}

/** Accepted and not past validity — required before order conversion (BRU-003, BRU-004). */
export function canConvertQuotationToOrder(
  status: QuotationStatusCode | string,
  validUntil: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  const effective = resolveEffectiveQuotationStatus(status, validUntil, now);
  return effective === QUOTATION_STATUS_CODES.ACCEPTED;
}

export function requiresRevisionToEdit(
  status: QuotationStatusCode | string
): boolean {
  return isQuotationLockedStatus(status);
}

export function timelineEventForStatusTransition(
  nextStatus: QuotationStatusCode
): CrmQuotationTimelineEventType | null {
  switch (nextStatus) {
    case QUOTATION_STATUS_CODES.SENT:
      return CRM_TIMELINE_EVENT_TYPES.QUOTATION_SENT;
    case QUOTATION_STATUS_CODES.ACCEPTED:
      return CRM_TIMELINE_EVENT_TYPES.QUOTATION_ACCEPTED;
    case QUOTATION_STATUS_CODES.REJECTED:
      return CRM_TIMELINE_EVENT_TYPES.QUOTATION_REJECTED;
    case QUOTATION_STATUS_CODES.EXPIRED:
      return CRM_TIMELINE_EVENT_TYPES.QUOTATION_EXPIRED;
    default:
      return null;
  }
}

export function nextRevisionVersionNumber(currentVersionNumber: number): number {
  return currentVersionNumber + 1;
}

export function resolveDefaultValidUntil(
  fromDate: Date = new Date(),
  validityDays: number
): Date {
  const result = new Date(fromDate);
  result.setDate(result.getDate() + validityDays);
  return result;
}
