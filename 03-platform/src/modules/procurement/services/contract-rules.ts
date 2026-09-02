/**
 * Purpose:
 * Pure BP-009 IP-07 contract lifecycle and commercial rules.
 */

import {
  CONTRACT_SOURCE_TYPES,
  CONTRACT_STATUSES,
  CONTRACT_VALUE_TYPES,
  PO_STATUSES,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import { validatePaymentTermsSchedule } from "@/modules/procurement/services/sourcing-response-rules";

export type ContractPaymentTermInput = {
  milestoneName: string;
  percentage: string;
  amount?: string | null;
  triggerEvent?: string | null;
  duePeriodDays?: number | null;
  comments?: string | null;
};

export type ContractPeriodValueInput = {
  periodYear: number;
  amount: string;
  description?: string | null;
};

export type ContractCommercialInput = {
  valueType: string;
  totalValue?: string | null;
  annualValue?: string | null;
  callOffCeiling?: string | null;
  currencyCode: string;
  paymentTerms?: ContractPaymentTermInput[];
  periodValues?: ContractPeriodValueInput[];
};

const CALL_OFF_BLOCKED_STATUSES = new Set<string>([
  CONTRACT_STATUSES.DRAFT,
  CONTRACT_STATUSES.PENDING_APPROVAL,
  CONTRACT_STATUSES.APPROVED,
  CONTRACT_STATUSES.PENDING_EXECUTION,
  CONTRACT_STATUSES.EXPIRED,
  CONTRACT_STATUSES.CLOSED,
  CONTRACT_STATUSES.CANCELLED,
  CONTRACT_STATUSES.REJECTED,
  CONTRACT_STATUSES.SUSPENDED,
  CONTRACT_STATUSES.TERMINATED,
]);

const COMMITTED_PO_STATUSES = new Set<string>([
  PO_STATUSES.PENDING_APPROVAL,
  PO_STATUSES.APPROVED,
  PO_STATUSES.ISSUED,
  PO_STATUSES.ACCEPTED,
  PO_STATUSES.CHANGE_REQUESTED,
  PO_STATUSES.PARTIALLY_FULFILLED,
  PO_STATUSES.FULFILLED,
  PO_STATUSES.CLOSED,
]);

function parseAmount(value: string | null | undefined): number {
  const parsed = Number(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function validateContractDates(startDate: string | null, endDate: string | null) {
  if (startDate && endDate && startDate > endDate) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "endDate",
    });
  }
}

export function validateContractCommercial(input: ContractCommercialInput) {
  const valueType = input.valueType.trim().toUpperCase();
  if (!Object.values(CONTRACT_VALUE_TYPES).includes(valueType as never)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "valueType",
    });
  }
  if (valueType === CONTRACT_VALUE_TYPES.FIXED && !input.totalValue?.trim()) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "totalValue",
    });
  }
  if (valueType === CONTRACT_VALUE_TYPES.CAPPED && !input.callOffCeiling?.trim()) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "callOffCeiling",
    });
  }
  const paymentTerms = validatePaymentTermsSchedule(input.paymentTerms ?? []);
  const periodValues = (input.periodValues ?? []).map((row, index) => {
    if (!Number.isInteger(row.periodYear) || row.periodYear < 1) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: `periodValues.${index}.periodYear`,
      });
    }
    const amount = parseAmount(row.amount);
    if (amount < 0) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: `periodValues.${index}.amount`,
      });
    }
    return {
      periodYear: row.periodYear,
      amount: row.amount,
      description: row.description?.trim() || null,
    };
  });
  return { valueType, paymentTerms, periodValues };
}

export function resolveContractCeiling(input: {
  valueType: string;
  totalValue: string | null;
  callOffCeiling: string | null;
}): string | null {
  const valueType = input.valueType.trim().toUpperCase();
  if (valueType === CONTRACT_VALUE_TYPES.INFORMATIONAL) {
    return null;
  }
  if (valueType === CONTRACT_VALUE_TYPES.CAPPED) {
    return input.callOffCeiling;
  }
  return input.totalValue;
}

export function computeRemainingContractValue(input: {
  valueType: string;
  ceiling: string | null;
  committedAmounts: string[];
}): { ceiling: string | null; committed: string; remaining: string | null } {
  const committed = input.committedAmounts.reduce((sum, row) => sum + parseAmount(row), 0);
  const committedLabel = committed.toFixed(2);
  if (
    input.valueType.trim().toUpperCase() === CONTRACT_VALUE_TYPES.INFORMATIONAL ||
    !input.ceiling
  ) {
    return { ceiling: null, committed: committedLabel, remaining: null };
  }
  const ceilingValue = parseAmount(input.ceiling);
  return {
    ceiling: ceilingValue.toFixed(2),
    committed: committedLabel,
    remaining: Math.max(ceilingValue - committed, 0).toFixed(2),
  };
}

export function assertCallOffAllowed(input: {
  status: string;
  callOffsPermitted: boolean;
  endDate: string | null;
  supplierEligible: boolean;
}) {
  if (!input.supplierEligible) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.SUPPLIER_BLACKLISTED, undefined, 409);
  }
  if (!input.callOffsPermitted) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.CONTRACT_CALLOFF_NOT_ALLOWED, undefined, 409);
  }
  if (CALL_OFF_BLOCKED_STATUSES.has(input.status)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.CONTRACT_CALLOFF_NOT_ALLOWED, undefined, 409);
  }
  if (input.endDate && input.endDate < new Date().toISOString().slice(0, 10)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.CONTRACT_CALLOFF_NOT_ALLOWED, undefined, 409);
  }
}

export function assertCallOffWithinCeiling(
  valueType: string,
  ceiling: string | null,
  committedAmounts: string[],
  callOffAmount: string
) {
  const remaining = computeRemainingContractValue({
    valueType,
    ceiling,
    committedAmounts,
  });
  if (remaining.remaining === null) {
    return;
  }
  if (parseAmount(callOffAmount) > parseAmount(remaining.remaining)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.CONTRACT_CEILING_EXCEEDED, undefined, 409);
  }
}

export function isCommittedPoStatus(status: string): boolean {
  return COMMITTED_PO_STATUSES.has(status);
}

export function contractStatusLabel(status: string): string {
  return status;
}

export function assertContractStatus(current: string, allowed: string | string[]) {
  const list = Array.isArray(allowed) ? allowed : [allowed];
  if (!list.includes(current)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.CONTRACT_INVALID_STATE, undefined, 409);
  }
}

export function isMaterialContractAmendment(input: {
  threshold: string | null;
  previousTotal: string | null;
  nextTotal: string | null;
  previousEndDate: string | null;
  nextEndDate: string | null;
  profileChanged: boolean;
}): boolean {
  if (input.profileChanged) {
    return true;
  }
  if (input.previousEndDate !== input.nextEndDate) {
    return true;
  }
  const threshold = parseAmount(input.threshold);
  if (threshold <= 0) {
    return false;
  }
  const delta = Math.abs(parseAmount(input.nextTotal) - parseAmount(input.previousTotal));
  return delta >= threshold;
}

export function deriveExpiryStatus(
  status: string,
  endDate: string | null,
  warningDays: number
): string {
  if (status !== CONTRACT_STATUSES.ACTIVE && status !== CONTRACT_STATUSES.EXPIRING) {
    return status;
  }
  if (!endDate) {
    return status === CONTRACT_STATUSES.EXPIRING ? CONTRACT_STATUSES.ACTIVE : status;
  }
  const today = new Date().toISOString().slice(0, 10);
  if (endDate < today) {
    return CONTRACT_STATUSES.EXPIRED;
  }
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + warningDays);
  if (endDate <= warningDate.toISOString().slice(0, 10)) {
    return CONTRACT_STATUSES.EXPIRING;
  }
  return CONTRACT_STATUSES.ACTIVE;
}

export function validateContractSource(sourceType: string) {
  if (!Object.values(CONTRACT_SOURCE_TYPES).includes(sourceType as never)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "sourceType",
    });
  }
}
