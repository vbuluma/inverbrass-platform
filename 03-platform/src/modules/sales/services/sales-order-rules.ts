/**
 * Purpose:
 * Pure BP-006 IP-01 rules — lifecycle, SoD, quantity, commercial copy, immutability.
 * No pricing, tax, discount or commission calculation.
 *
 * Implementation Package:
 * BP-006 / IP-01 – Sales & Order Creation
 */

import {
  addScaled,
  parseMoneyToScaled,
  scaledToString,
} from "@/modules/commercial/money/commercial-money";
import type {
  CommercialSnapshot,
  CommercialTransactionContract,
} from "@/modules/commercial/types";
import {
  SALES_ORDER_STATUS_CODES,
  SALES_ORDER_STATUS_LABELS,
  type SalesOrderStatusCode,
} from "@/modules/sales/constants";
import { SalesOrderError, SALES_ERROR_CODES, SALES_USER_MESSAGES } from "@/modules/sales/errors";
import {
  canTransitionSalesLifecycle,
  assertSalesLifecycleTransition,
  assertOrdinaryEditAllowed,
} from "@/modules/sales/services/order-lifecycle-rules";

const IP01_CONFIRMATION_TARGETS = new Set<string>([
  SALES_ORDER_STATUS_CODES.SUBMITTED_FOR_CONFIRMATION,
  SALES_ORDER_STATUS_CODES.CONFIRMED,
  SALES_ORDER_STATUS_CODES.DRAFT,
]);

export function salesStatusLabel(status: string): string {
  return SALES_ORDER_STATUS_LABELS[status] ?? status;
}

export function isDraftStatus(status: string): boolean {
  return status === SALES_ORDER_STATUS_CODES.DRAFT;
}

export function isConfirmedStatus(status: string): boolean {
  return status === SALES_ORDER_STATUS_CODES.CONFIRMED;
}

export function isSubmittedStatus(status: string): boolean {
  return status === SALES_ORDER_STATUS_CODES.SUBMITTED_FOR_CONFIRMATION;
}

export function canTransitionSalesOrderStatus(
  from: string,
  to: string
): boolean {
  return canTransitionSalesLifecycle(from, to);
}

export function assertSalesOrderTransition(from: string, to: string): void {
  assertSalesLifecycleTransition(from, to);
}

export function assertIp01DoesNotAdvanceFulfilment(to: string): void {
  const blocked: SalesOrderStatusCode[] = [
    SALES_ORDER_STATUS_CODES.IN_PROGRESS,
    SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED,
    SALES_ORDER_STATUS_CODES.FULFILLED,
    SALES_ORDER_STATUS_CODES.COMPLETED,
    SALES_ORDER_STATUS_CODES.CANCELLED,
  ];
  if (blocked.includes(to as SalesOrderStatusCode)) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.INVALID_STATUS_TRANSITION,
      SALES_USER_MESSAGES.INVALID_STATUS_TRANSITION,
      409,
      { field: "status", entity: "sale" }
    );
  }
  if (!IP01_CONFIRMATION_TARGETS.has(to)) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.INVALID_STATUS_TRANSITION,
      SALES_USER_MESSAGES.INVALID_STATUS_TRANSITION,
      409,
      { field: "status", entity: "sale" }
    );
  }
}

export function assertValidQuantity(quantity: number, field = "quantity"): void {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.INVALID_QUANTITY,
      SALES_USER_MESSAGES.INVALID_QUANTITY,
      400,
      {
        field,
        entity: "quantity",
        nextAction: "Enter a quantity greater than zero.",
      }
    );
  }
}

export function assertRequiredLines(lineCount: number): void {
  if (lineCount < 1) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.REQUIRED_LINES_MISSING,
      SALES_USER_MESSAGES.REQUIRED_LINES_MISSING,
      400,
      {
        field: "lines",
        entity: "sale line",
        nextAction: "Select a product or service and enter a quantity.",
      }
    );
  }
}

export function assertSameBusiness(
  contextBusinessId: string,
  entityBusinessId: string | null | undefined,
  code: typeof SALES_ERROR_CODES[keyof typeof SALES_ERROR_CODES],
  entity: string
): void {
  if (!entityBusinessId || entityBusinessId !== contextBusinessId) {
    throw new SalesOrderError(code, SALES_USER_MESSAGES[code], 403, {
      entity,
      nextAction: `Choose a ${entity} that belongs to this business.`,
    });
  }
}

export function assertSegregationOfDuties(
  requiresSod: boolean,
  makerUserId: string | null | undefined,
  checkerUserId: string | null | undefined
): void {
  if (!requiresSod) {
    return;
  }
  if (!makerUserId || !checkerUserId || makerUserId === checkerUserId) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.SOD_VIOLATION,
      SALES_USER_MESSAGES.SOD_VIOLATION,
      403,
      {
        field: "confirmedBy",
        entity: "confirmation",
        nextAction: "Ask another authorised person to approve this sale.",
      }
    );
  }
}

export function assertDraftEditable(status: string): void {
  assertOrdinaryEditAllowed(status);
  if (!isDraftStatus(status)) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.MATERIAL_VALUE_IMMUTABLE,
      SALES_USER_MESSAGES.MATERIAL_VALUE_IMMUTABLE,
      409,
      {
        entity: "sale",
        nextAction: "Open the sale to review it. Changes after confirmation need a later amendment process.",
      }
    );
  }
}

export function copiedExpectedAmountFromContract(
  contract: CommercialTransactionContract
): string {
  return contract.commercial.expectedPayable;
}

export function sumExpectedPayables(
  amounts: string[],
  currencyCode: string
): string {
  if (amounts.length === 0) {
    return scaledToString(parseMoneyToScaled("0", currencyCode));
  }
  let total = parseMoneyToScaled(amounts[0] ?? "0", currencyCode);
  for (const amount of amounts.slice(1)) {
    total = addScaled(total, parseMoneyToScaled(amount, currencyCode));
  }
  return scaledToString(total);
}

export function assertCurrencyMatches(
  orderCurrency: string,
  contractCurrency: string
): void {
  if (orderCurrency.trim().toUpperCase() !== contractCurrency.trim().toUpperCase()) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.COMMERCIAL_CURRENCY_MISMATCH,
      SALES_USER_MESSAGES.COMMERCIAL_CURRENCY_MISMATCH,
      409,
      {
        field: "currencyCode",
        entity: "commercial total",
        nextAction: "Use the same currency as the commercial total, or prepare the total again.",
      }
    );
  }
}

export function assertOfferingMatchesSnapshot(
  offeringId: string,
  snapshot: CommercialSnapshot
): void {
  if (snapshot.resolution.offeringId !== offeringId) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.COMMERCIAL_OFFERING_MISMATCH,
      SALES_USER_MESSAGES.COMMERCIAL_OFFERING_MISMATCH,
      409,
      {
        field: "offeringId",
        entity: "commercial total",
        nextAction: "Prepare the commercial total for the selected product or service.",
      }
    );
  }
}

export function assertQuantityMatchesSnapshot(
  quantity: number,
  snapshot: CommercialSnapshot
): void {
  if (Number(snapshot.resolution.quantity) !== Number(quantity)) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.QUANTITY_CONTRACT_MISMATCH,
      SALES_USER_MESSAGES.QUANTITY_CONTRACT_MISMATCH,
      409,
      {
        field: "quantity",
        entity: "quantity",
        nextAction: "Refresh the commercial total for this quantity.",
      }
    );
  }
}

export function assertExpectedCopiedNotInvented(
  storedExpected: string,
  contractExpected: string,
  currencyCode: string
): void {
  const stored = parseMoneyToScaled(storedExpected, currencyCode);
  const fromContract = parseMoneyToScaled(contractExpected, currencyCode);
  if (stored.units !== fromContract.units) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.COMMERCIAL_AMOUNT_MISMATCH,
      SALES_USER_MESSAGES.COMMERCIAL_AMOUNT_MISMATCH,
      409,
      {
        field: "expectedAmount",
        entity: "expected total",
        nextAction: "Use the commercial total as shown. Do not type a different amount.",
      }
    );
  }
}

export function nextActionForStatus(
  status: string,
  requiresSod: boolean
): string {
  if (isDraftStatus(status)) {
    return requiresSod
      ? "Review the expected total, then submit this sale for confirmation."
      : "Review the expected total, then confirm this sale.";
  }
  if (isSubmittedStatus(status)) {
    return "Another authorised person must confirm this sale.";
  }
  if (isConfirmedStatus(status)) {
    return "Payment is not yet recorded. Fulfilment will follow in a later step.";
  }
  return "Open the sale to see the next action.";
}

export function lineTypeFromProductType(productTypeCode: string): string {
  return productTypeCode === "PHYSICAL_PRODUCT" ? "PHYSICAL" : "SERVICE";
}
