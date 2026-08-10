/**
 * Purpose:
 * Pure quotation approval business-rule helpers.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.6)
 */

import {
  DEFAULT_QUOTATION_APPROVAL_THRESHOLD,
  QUOTATION_APPROVAL_STATUS_CODES,
  type QuotationApprovalStatusCode,
} from "@/modules/crm/constants";

export function requiresApprovalByValue(
  grandTotal: number,
  threshold: number = DEFAULT_QUOTATION_APPROVAL_THRESHOLD
): boolean {
  return grandTotal >= threshold;
}

export function resolveRequiredApprovalStatus(
  grandTotal: number,
  threshold: number = DEFAULT_QUOTATION_APPROVAL_THRESHOLD
): QuotationApprovalStatusCode {
  return requiresApprovalByValue(grandTotal, threshold)
    ? QUOTATION_APPROVAL_STATUS_CODES.PENDING
    : QUOTATION_APPROVAL_STATUS_CODES.NOT_REQUIRED;
}

export function canSendQuotationWithApproval(
  approvalStatus: QuotationApprovalStatusCode | string
): boolean {
  return (
    approvalStatus === QUOTATION_APPROVAL_STATUS_CODES.NOT_REQUIRED ||
    approvalStatus === QUOTATION_APPROVAL_STATUS_CODES.APPROVED
  );
}

export function canSubmitForApproval(
  approvalStatus: QuotationApprovalStatusCode | string,
  grandTotal: number,
  threshold: number = DEFAULT_QUOTATION_APPROVAL_THRESHOLD
): boolean {
  return (
    requiresApprovalByValue(grandTotal, threshold) &&
    approvalStatus !== QUOTATION_APPROVAL_STATUS_CODES.APPROVED &&
    approvalStatus !== QUOTATION_APPROVAL_STATUS_CODES.PENDING
  );
}
