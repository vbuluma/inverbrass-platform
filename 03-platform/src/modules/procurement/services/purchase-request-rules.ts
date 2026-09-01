/**
 * Purpose:
 * Pure rules for BP-009 IP-02 purchase requests: lifecycle, budget check, lines.
 */

import {
  BUDGET_CHECK_STATUSES,
  BUDGET_SOURCES,
  EDITABLE_REQUEST_STATUSES,
  OVER_BUDGET_MODES,
  PENDING_APPROVAL_STATUSES,
  PROCUREMENT_PERMISSIONS,
  PROCUREMENT_TYPES,
  PURCHASE_REQUEST_ORIGIN_TYPES,
  PURCHASE_REQUEST_STATUSES,
  type BudgetCheckStatus,
  type OverBudgetMode,
  type PurchaseRequestStatus,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { ProcurementActor, PurchaseRequestLineDraft } from "@/modules/procurement/types";
import { assertPermission } from "@/modules/procurement/services/procurement-rules";

export function assertRequestRead(actor: ProcurementActor) {
  assertPermission(actor, PROCUREMENT_PERMISSIONS.REQUEST_READ);
}

export function parseAmount(value: string | null | undefined, field: string): number {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return 0;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ProcurementError(
      PROCUREMENT_ERROR_CODES.INVALID_ESTIMATED_VALUE,
      undefined,
      400,
      { field }
    );
  }
  return parsed;
}

export function parsePositiveQuantity(value: string, field = "quantity"): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_QUANTITY, undefined, 400, {
      field,
    });
  }
  return parsed;
}

export function normalizeCurrency(value: string | undefined): string {
  const code = value?.trim().toUpperCase() ?? "";
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.CURRENCY_REQUIRED, undefined, 400, {
      field: "currencyCode",
    });
  }
  return code;
}

export function isPurchaseRequestStatus(value: string): value is PurchaseRequestStatus {
  return Object.values(PURCHASE_REQUEST_STATUSES).includes(value as PurchaseRequestStatus);
}

export function isEditableStatus(status: string) {
  return EDITABLE_REQUEST_STATUSES.includes(status as PurchaseRequestStatus);
}

export function isPendingApproval(status: string) {
  return PENDING_APPROVAL_STATUSES.includes(status as PurchaseRequestStatus);
}

export function assertCanEdit(status: string) {
  if (!isEditableStatus(status)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.REQUEST_NOT_EDITABLE, undefined, 409);
  }
}

export function validateOriginType(value: string | undefined): string {
  const origin = value?.trim() || PURCHASE_REQUEST_ORIGIN_TYPES.AD_HOC;
  if (
    !Object.values(PURCHASE_REQUEST_ORIGIN_TYPES).includes(
      origin as (typeof PURCHASE_REQUEST_ORIGIN_TYPES)[keyof typeof PURCHASE_REQUEST_ORIGIN_TYPES]
    )
  ) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "originType",
    });
  }
  return origin;
}

export function validateProcurementType(value: string): string {
  if (
    !Object.values(PROCUREMENT_TYPES).includes(
      value as (typeof PROCUREMENT_TYPES)[keyof typeof PROCUREMENT_TYPES]
    )
  ) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "procurementType",
    });
  }
  return value;
}

export function validateBudgetSource(value: string | undefined): string {
  const source = value?.trim() ?? "";
  if (
    !Object.values(BUDGET_SOURCES).includes(
      source as (typeof BUDGET_SOURCES)[keyof typeof BUDGET_SOURCES]
    )
  ) {
    throw new ProcurementError(
      PROCUREMENT_ERROR_CODES.BUDGET_SOURCE_REQUIRED,
      undefined,
      400,
      { field: "budgetSource" }
    );
  }
  return source;
}

export function validateLines(lines: PurchaseRequestLineDraft[]): PurchaseRequestLineDraft[] {
  if (lines.length === 0) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.EMPTY_REQUEST, undefined, 400, {
      field: "lines",
    });
  }
  return lines.map((line, index) => {
    parsePositiveQuantity(line.quantity, `lines.${index}.quantity`);
    parseAmount(line.estimatedValue, `lines.${index}.estimatedValue`);
    const description = line.description?.trim() ?? "";
    if (!description) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: `lines.${index}.description`,
      });
    }
    const uom = line.uom?.trim() ?? "";
    if (!uom) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: `lines.${index}.uom`,
      });
    }
    return {
      ...line,
      description,
      uom,
      specification: line.specification?.trim() || null,
      catalogueItemId: line.catalogueItemId?.trim() || null,
      requiredDate: line.requiredDate?.trim() || null,
    };
  });
}

export function sumLineValues(lines: PurchaseRequestLineDraft[]): string {
  const total = lines.reduce((sum, line) => sum + parseAmount(line.estimatedValue, "estimatedValue"), 0);
  return total.toFixed(2);
}

export type BudgetCheckInput = {
  budgetSource: string;
  budgetReference?: string | null;
  budgetAvailableAmount?: string | null;
  budgetApprovalReference?: string | null;
  budgetApprovalDate?: string | null;
  budgetApprover?: string | null;
  estimatedValue: string;
  overBudgetMode: OverBudgetMode;
};

export function evaluateBudgetCheck(input: BudgetCheckInput): BudgetCheckStatus {
  const source = input.budgetSource;
  if (source === BUDGET_SOURCES.PLANNED || source === BUDGET_SOURCES.EXISTING_BUDGET) {
    if (!input.budgetReference?.trim()) {
      throw new ProcurementError(
        PROCUREMENT_ERROR_CODES.BUDGET_REFERENCE_REQUIRED,
        undefined,
        400,
        { field: "budgetReference" }
      );
    }
  }
  if (source === BUDGET_SOURCES.AD_HOC_BUDGET_APPROVAL) {
    if (!input.budgetApprovalReference?.trim()) {
      throw new ProcurementError(
        PROCUREMENT_ERROR_CODES.BUDGET_EVIDENCE_REQUIRED,
        undefined,
        400,
        { field: "budgetApprovalReference" }
      );
    }
    return BUDGET_CHECK_STATUSES.EVIDENCE_RECORDED;
  }

  const availableRaw = input.budgetAvailableAmount?.trim() ?? "";
  if (!availableRaw) {
    return BUDGET_CHECK_STATUSES.NOT_APPLICABLE;
  }
  const available = parseAmount(availableRaw, "budgetAvailableAmount");
  const estimated = parseAmount(input.estimatedValue, "estimatedValue");
  if (estimated <= available) {
    return BUDGET_CHECK_STATUSES.WITHIN_BUDGET;
  }
  if (input.overBudgetMode === OVER_BUDGET_MODES.BLOCK) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.OVER_BUDGET, undefined, 409, {
      field: "estimatedValue",
    });
  }
  if (!input.budgetApprovalReference?.trim()) {
    throw new ProcurementError(
      PROCUREMENT_ERROR_CODES.BUDGET_EVIDENCE_REQUIRED,
      undefined,
      400,
      { field: "budgetApprovalReference" }
    );
  }
  return BUDGET_CHECK_STATUSES.OVER_BUDGET;
}

export function resolveOverBudgetMode(value: string | null | undefined): OverBudgetMode {
  if (value === OVER_BUDGET_MODES.REQUIRE_EVIDENCE) {
    return OVER_BUDGET_MODES.REQUIRE_EVIDENCE;
  }
  return OVER_BUDGET_MODES.BLOCK;
}
