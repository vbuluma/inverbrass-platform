import {
  CRM_VISIT_NUMBER_PREFIX,
  CRM_VISIT_STATUS_CODES,
  type CrmVisitStatusCode,
} from "@/modules/crm-visit/constants";

export function buildVisitNumber(sequence: number): string {
  return `${CRM_VISIT_NUMBER_PREFIX}-${String(sequence).padStart(6, "0")}`;
}

export function isVisitEditable(statusCode: string): boolean {
  return (
    statusCode === CRM_VISIT_STATUS_CODES.DRAFT ||
    statusCode === CRM_VISIT_STATUS_CODES.IN_PROGRESS ||
    statusCode === CRM_VISIT_STATUS_CODES.RETURNED
  );
}

export function canSubmitVisit(statusCode: string): boolean {
  return (
    statusCode === CRM_VISIT_STATUS_CODES.DRAFT ||
    statusCode === CRM_VISIT_STATUS_CODES.IN_PROGRESS ||
    statusCode === CRM_VISIT_STATUS_CODES.RETURNED
  );
}

export function canReviewVisit(statusCode: string): boolean {
  return statusCode === CRM_VISIT_STATUS_CODES.SUBMITTED;
}

export function isApprovedVisit(statusCode: string): boolean {
  return statusCode === CRM_VISIT_STATUS_CODES.APPROVED;
}

export function resolveReportDueAt(
  from: Date = new Date(),
  hours = 24
): Date {
  return new Date(from.getTime() + hours * 60 * 60_000);
}

export function hasEntityLinkRequirement(primaryPartyId: string): boolean {
  return Boolean(primaryPartyId?.trim());
}

export function isOpenActionItemStatus(statusCode: string): boolean {
  return statusCode === "OPEN" || statusCode === "IN_PROGRESS";
}

export function assertEditableStatus(statusCode: CrmVisitStatusCode | string): boolean {
  return isVisitEditable(statusCode);
}
