/**
 * Purpose:
 * Authoritative BP-006 IP-02 lifecycle, quantity, and completion-gate rules.
 * Operational quantities are derived from IP-03 outcomes — never stored as a
 * competing fulfilled quantity. No commercial recalculation.
 *
 * Implementation Package:
 * BP-006 / IP-02 – Order Lifecycle & Fulfilment
 */

import {
  SALES_COMPLETION_BLOCKER_CODES,
  SALES_CUSTOMER_STATUS_LABELS,
  SALES_INSPECTION_STATUS_CODES,
  SALES_LINE_FULFILMENT_STATUS_CODES,
  SALES_LINE_FULFILMENT_STATUS_LABELS,
  SALES_ORDER_STATUS_CODES,
  SALES_ORDER_STATUS_LABELS,
  SALES_SERVICE_COMPLETION_STATUS_CODES,
  type SalesCompletionBlockerCode,
  type SalesLineFulfilmentStatusCode,
} from "@/modules/sales/constants";
import { SalesOrderError, SALES_ERROR_CODES, SALES_USER_MESSAGES } from "@/modules/sales/errors";
import type {
  LineDispositionOutcome,
  LineFulfilmentOutcome,
  OrderDispositionOutcome,
  OrderFulfilmentOutcome,
  SalesOrderLineRecord,
} from "@/modules/sales/ports";
import type {
  SalesCompletionReadinessView,
  SalesLineQuantityView,
  SalesNextActionReadiness,
} from "@/modules/sales/types";

const QTY_SCALE = 1_000_000;

function statusLabel(status: string): string {
  return SALES_ORDER_STATUS_LABELS[status] ?? status;
}

export const SALES_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  [SALES_ORDER_STATUS_CODES.DRAFT]: [
    SALES_ORDER_STATUS_CODES.SUBMITTED_FOR_CONFIRMATION,
    SALES_ORDER_STATUS_CODES.CONFIRMED,
    SALES_ORDER_STATUS_CODES.CANCELLED,
  ],
  [SALES_ORDER_STATUS_CODES.SUBMITTED_FOR_CONFIRMATION]: [
    SALES_ORDER_STATUS_CODES.CONFIRMED,
    SALES_ORDER_STATUS_CODES.DRAFT,
    SALES_ORDER_STATUS_CODES.CANCELLED,
  ],
  [SALES_ORDER_STATUS_CODES.CONFIRMED]: [
    SALES_ORDER_STATUS_CODES.IN_PROGRESS,
    SALES_ORDER_STATUS_CODES.CANCELLED,
  ],
  [SALES_ORDER_STATUS_CODES.IN_PROGRESS]: [
    SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED,
    SALES_ORDER_STATUS_CODES.COMPLETED,
    SALES_ORDER_STATUS_CODES.CANCELLED,
  ],
  [SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED]: [
    SALES_ORDER_STATUS_CODES.COMPLETED,
    SALES_ORDER_STATUS_CODES.CANCELLED,
  ],
  [SALES_ORDER_STATUS_CODES.FULFILLED]: [],
  [SALES_ORDER_STATUS_CODES.COMPLETED]: [],
  [SALES_ORDER_STATUS_CODES.CANCELLED]: [],
};

const FULFILMENT_ELIGIBLE_STATUSES = new Set<string>([
  SALES_ORDER_STATUS_CODES.CONFIRMED,
  SALES_ORDER_STATUS_CODES.IN_PROGRESS,
  SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED,
]);

const COMPLETION_ELIGIBLE_STATUSES = new Set<string>([
  SALES_ORDER_STATUS_CODES.IN_PROGRESS,
  SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED,
]);

const CANCELLATION_ELIGIBLE_STATUSES = new Set<string>([
  SALES_ORDER_STATUS_CODES.DRAFT,
  SALES_ORDER_STATUS_CODES.SUBMITTED_FOR_CONFIRMATION,
  SALES_ORDER_STATUS_CODES.CONFIRMED,
  SALES_ORDER_STATUS_CODES.IN_PROGRESS,
  SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED,
]);

export function parseQuantity(value: string | number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.INVALID_QUANTITY,
      SALES_USER_MESSAGES.INVALID_QUANTITY,
      400,
      { field: "quantity", entity: "quantity" }
    );
  }
  return roundQuantity(numeric);
}

export function roundQuantity(value: number): number {
  return Math.round(value * QTY_SCALE) / QTY_SCALE;
}

export function formatQuantity(value: number): string {
  const rounded = roundQuantity(value);
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return String(rounded);
}

export function customerStatusLabel(status: string): string {
  return SALES_CUSTOMER_STATUS_LABELS[status] ?? statusLabel(status);
}

export function canTransitionSalesLifecycle(from: string, to: string): boolean {
  const target = normalizeLifecycleTarget(to);
  return (SALES_LIFECYCLE_TRANSITIONS[from] ?? []).includes(target);
}

export function normalizeLifecycleTarget(status: string): string {
  if (status === SALES_ORDER_STATUS_CODES.FULFILLED) {
    return SALES_ORDER_STATUS_CODES.COMPLETED;
  }
  return status;
}

export function walkLifecycleSteps(from: string, to: string): string[] {
  if (from === to) {
    return [];
  }
  if (canTransitionSalesLifecycle(from, to)) {
    return [normalizeLifecycleTarget(to)];
  }
  if (
    from === SALES_ORDER_STATUS_CODES.CONFIRMED &&
    to === SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED
  ) {
    return [
      SALES_ORDER_STATUS_CODES.IN_PROGRESS,
      SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED,
    ];
  }
  throw new SalesOrderError(
    SALES_ERROR_CODES.INVALID_STATUS_TRANSITION,
    SALES_USER_MESSAGES.INVALID_STATUS_TRANSITION,
    409,
    {
      field: "status",
      entity: "sale",
      nextAction: `This sale is ${statusLabel(from)} and cannot move to ${statusLabel(to)}.`,
    }
  );
}

export function assertSalesLifecycleTransition(from: string, to: string): void {
  const target = normalizeLifecycleTarget(to);
  if (!canTransitionSalesLifecycle(from, target)) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.INVALID_STATUS_TRANSITION,
      SALES_USER_MESSAGES.INVALID_STATUS_TRANSITION,
      409,
      {
        field: "status",
        entity: "sale",
        nextAction: `This sale is ${statusLabel(from)} and cannot move to ${statusLabel(target)}.`,
      }
    );
  }
}

export function isCancelledStatus(status: string): boolean {
  return status === SALES_ORDER_STATUS_CODES.CANCELLED;
}

export function isCompletedStatus(status: string): boolean {
  return (
    status === SALES_ORDER_STATUS_CODES.COMPLETED ||
    status === SALES_ORDER_STATUS_CODES.FULFILLED
  );
}

export function isFulfilmentEligibleStatus(status: string): boolean {
  return FULFILMENT_ELIGIBLE_STATUSES.has(status);
}

export function assertFulfilmentProgressionAllowed(status: string): void {
  if (isCancelledStatus(status)) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.ORDER_CANCELLED,
      SALES_USER_MESSAGES.ORDER_CANCELLED,
      409,
      {
        field: "status",
        entity: "sale",
        nextAction: "Open a new sale if delivery is still required.",
      }
    );
  }
  if (isCompletedStatus(status)) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.ORDER_ALREADY_COMPLETED,
      SALES_USER_MESSAGES.ORDER_ALREADY_COMPLETED,
      409,
      { field: "status", entity: "sale" }
    );
  }
  if (!isFulfilmentEligibleStatus(status)) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.FULFILMENT_NOT_ALLOWED,
      SALES_USER_MESSAGES.FULFILMENT_NOT_ALLOWED,
      409,
      {
        field: "status",
        entity: "sale",
        nextAction: "Confirm the sale before recording delivery.",
      }
    );
  }
}

export function assertOrdinaryEditAllowed(status: string): void {
  if (isCompletedStatus(status)) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.MATERIAL_VALUE_IMMUTABLE,
      "Completed sales cannot be edited as ordinary records. Use a controlled amendment later.",
      409,
      {
        entity: "sale",
        nextAction: "Open the sale to review it. Changes after completion need a later amendment process.",
      }
    );
  }
}

export function assertCancellationAuthorized(
  status: string,
  authorized: boolean
): void {
  if (isCompletedStatus(status)) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.INVALID_STATUS_TRANSITION,
      "Completed sales cannot be cancelled by ordinary edit.",
      409,
      { field: "status", entity: "sale" }
    );
  }
  if (!CANCELLATION_ELIGIBLE_STATUSES.has(status)) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.INVALID_STATUS_TRANSITION,
      SALES_USER_MESSAGES.INVALID_STATUS_TRANSITION,
      409,
      { field: "status", entity: "sale" }
    );
  }
  if (!authorized) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.CANCELLATION_NOT_AUTHORIZED,
      SALES_USER_MESSAGES.CANCELLATION_NOT_AUTHORIZED,
      409,
      {
        field: "status",
        entity: "sale",
        nextAction: "Start cancellation through the controlled cancellation process.",
      }
    );
  }
}

export type DerivedLineFulfilment = SalesLineQuantityView & {
  orderLineId: string;
  hasActivity: boolean;
  inspectionStatus: string;
  serviceCompletionStatus: string;
  evidenceMissing: boolean;
  status: SalesLineFulfilmentStatusCode;
  statusLabel: string;
};

function findLineOutcome(
  outcomes: OrderFulfilmentOutcome,
  orderLineId: string
): LineFulfilmentOutcome | null {
  return (
    outcomes.lines.find((line) => line.orderLineId === orderLineId) ?? null
  );
}

function findLineDisposition(
  disposition: OrderDispositionOutcome,
  orderLineId: string
): LineDispositionOutcome | null {
  return (
    disposition.lines.find((line) => line.orderLineId === orderLineId) ?? null
  );
}

export function deriveLineQuantities(
  orderedRaw: string | number,
  outcome: LineFulfilmentOutcome | null,
  disposition: LineDispositionOutcome | null
): SalesLineQuantityView {
  const ordered = parseQuantity(orderedRaw);
  const accepted = parseQuantity(outcome?.acceptedQuantity ?? 0);
  const rejected = parseQuantity(outcome?.rejectedQuantity ?? 0);
  const delivered = roundQuantity(accepted + rejected);
  const missing = roundQuantity(ordered - delivered);
  const closedWithoutReplacement = parseQuantity(
    disposition?.closedWithoutReplacementQuantity ?? 0
  );
  const replacementPending = parseQuantity(
    disposition?.replacementPendingQuantity ?? 0
  );
  const dispositionedRejected = roundQuantity(
    closedWithoutReplacement + replacementPending
  );
  const openRejected = roundQuantity(Math.max(0, rejected - dispositionedRejected));
  const outstanding = roundQuantity(Math.max(0, ordered - accepted - closedWithoutReplacement));

  if (accepted > ordered) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.ACCEPTED_EXCEEDS_ORDERED,
      SALES_USER_MESSAGES.ACCEPTED_EXCEEDS_ORDERED,
      409,
      {
        field: "acceptedQuantity",
        entity: "sale line",
        nextAction: "Accepted quantity must stay within the ordered quantity.",
      }
    );
  }
  if (delivered > ordered) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.INVALID_FULFILMENT_OUTCOME,
      "Delivered quantity cannot be greater than the ordered quantity.",
      409,
      { field: "deliveredQuantity", entity: "sale line" }
    );
  }
  if (dispositionedRejected > rejected) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.INVALID_FULFILMENT_OUTCOME,
      "Closed or replacement quantity cannot exceed rejected quantity.",
      409,
      { field: "rejectedQuantity", entity: "sale line" }
    );
  }

  const missingPlusOpenRejected = roundQuantity(
    missing + openRejected + replacementPending
  );
  if (roundQuantity(missingPlusOpenRejected) !== outstanding) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.INVALID_FULFILMENT_OUTCOME,
      "Outstanding quantity must equal ordered minus accepted (missing plus open rejected).",
      409,
      { field: "outstandingQuantity", entity: "sale line" }
    );
  }

  return {
    ordered,
    accepted,
    rejected,
    delivered,
    missing,
    outstanding,
    openRejected,
    closedWithoutReplacement,
    replacementPending,
  };
}

export function deriveLineFulfilmentStatus(
  quantities: SalesLineQuantityView,
  options: {
    orderCancelled: boolean;
    hasActivity: boolean;
    inspectionStatus: string;
    serviceCompletionStatus: string;
  }
): SalesLineFulfilmentStatusCode {
  if (options.orderCancelled) {
    return SALES_LINE_FULFILMENT_STATUS_CODES.CANCELLED;
  }
  if (
    options.inspectionStatus === SALES_INSPECTION_STATUS_CODES.FAILED ||
    quantities.openRejected > 0
  ) {
    if (quantities.outstanding > 0) {
      return SALES_LINE_FULFILMENT_STATUS_CODES.BLOCKED;
    }
  }
  if (quantities.outstanding === 0 && quantities.ordered > 0) {
    const inspectionOk =
      options.inspectionStatus === SALES_INSPECTION_STATUS_CODES.NOT_REQUIRED ||
      options.inspectionStatus === SALES_INSPECTION_STATUS_CODES.PASSED;
    const serviceOk =
      options.serviceCompletionStatus ===
        SALES_SERVICE_COMPLETION_STATUS_CODES.NOT_REQUIRED ||
      options.serviceCompletionStatus ===
        SALES_SERVICE_COMPLETION_STATUS_CODES.COMPLETE;
    if (inspectionOk && serviceOk) {
      return SALES_LINE_FULFILMENT_STATUS_CODES.FULFILLED;
    }
    return SALES_LINE_FULFILMENT_STATUS_CODES.BLOCKED;
  }
  if (quantities.accepted > 0 && quantities.outstanding > 0) {
    return SALES_LINE_FULFILMENT_STATUS_CODES.PARTIALLY_FULFILLED;
  }
  if (options.hasActivity || quantities.delivered > 0) {
    return SALES_LINE_FULFILMENT_STATUS_CODES.IN_PROGRESS;
  }
  return SALES_LINE_FULFILMENT_STATUS_CODES.NOT_STARTED;
}

export function deriveOrderLineFulfilment(
  line: SalesOrderLineRecord,
  outcomes: OrderFulfilmentOutcome,
  disposition: OrderDispositionOutcome,
  orderCancelled: boolean
): DerivedLineFulfilment {
  if (outcomes.businessId !== line.businessId || outcomes.orderId !== line.salesOrderId) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.CROSS_BUSINESS_ACCESS,
      SALES_USER_MESSAGES.CROSS_BUSINESS_ACCESS,
      403,
      { entity: "delivery result" }
    );
  }
  const outcome = findLineOutcome(outcomes, line.id);
  if (outcome && (outcome.businessId !== line.businessId || outcome.orderId !== line.salesOrderId)) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.CROSS_BUSINESS_ACCESS,
      SALES_USER_MESSAGES.CROSS_BUSINESS_ACCESS,
      403,
      { entity: "delivery result" }
    );
  }
  const lineDisposition = findLineDisposition(disposition, line.id);
  const quantities = deriveLineQuantities(line.quantity, outcome, lineDisposition);
  const inspectionStatus =
    outcome?.inspectionStatus ?? SALES_INSPECTION_STATUS_CODES.NOT_REQUIRED;
  const serviceCompletionStatus =
    outcome?.serviceCompletionStatus ??
    SALES_SERVICE_COMPLETION_STATUS_CODES.NOT_REQUIRED;
  const hasActivity = Boolean(outcome?.hasActivity || quantities.delivered > 0);
  const status = deriveLineFulfilmentStatus(quantities, {
    orderCancelled,
    hasActivity,
    inspectionStatus,
    serviceCompletionStatus,
  });
  return {
    orderLineId: line.id,
    ...quantities,
    hasActivity,
    inspectionStatus,
    serviceCompletionStatus,
    evidenceMissing: Boolean(outcome?.mandatoryEvidenceMissing),
    status,
    statusLabel: SALES_LINE_FULFILMENT_STATUS_LABELS[status] ?? status,
  };
}

export function sumLineQuantities(lines: DerivedLineFulfilment[]): SalesLineQuantityView {
  return lines.reduce<SalesLineQuantityView>(
    (total, line) => ({
      ordered: roundQuantity(total.ordered + line.ordered),
      accepted: roundQuantity(total.accepted + line.accepted),
      rejected: roundQuantity(total.rejected + line.rejected),
      delivered: roundQuantity(total.delivered + line.delivered),
      missing: roundQuantity(total.missing + line.missing),
      outstanding: roundQuantity(total.outstanding + line.outstanding),
      openRejected: roundQuantity(total.openRejected + line.openRejected),
      closedWithoutReplacement: roundQuantity(
        total.closedWithoutReplacement + line.closedWithoutReplacement
      ),
      replacementPending: roundQuantity(
        total.replacementPending + line.replacementPending
      ),
    }),
    {
      ordered: 0,
      accepted: 0,
      rejected: 0,
      delivered: 0,
      missing: 0,
      outstanding: 0,
      openRejected: 0,
      closedWithoutReplacement: 0,
      replacementPending: 0,
    }
  );
}

export function deriveOperationalHeaderStatus(
  currentStatus: string,
  lines: DerivedLineFulfilment[]
): string {
  if (isCancelledStatus(currentStatus)) {
    return SALES_ORDER_STATUS_CODES.CANCELLED;
  }
  if (isCompletedStatus(currentStatus)) {
    return SALES_ORDER_STATUS_CODES.COMPLETED;
  }
  const totals = sumLineQuantities(lines);
  const hasActivity = lines.some((line) => line.hasActivity);
  if (!hasActivity) {
    return currentStatus === SALES_ORDER_STATUS_CODES.CONFIRMED
      ? SALES_ORDER_STATUS_CODES.CONFIRMED
      : currentStatus;
  }
  if (totals.accepted > 0 && totals.outstanding > 0) {
    return SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED;
  }
  if (currentStatus === SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED) {
    return SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED;
  }
  return SALES_ORDER_STATUS_CODES.IN_PROGRESS;
}

export function evaluateCompletionBlockers(input: {
  status: string;
  lines: DerivedLineFulfilment[];
  checklistPassed: boolean;
  checklistBlockers?: string[];
}): SalesCompletionBlockerCode[] {
  const blockers: SalesCompletionBlockerCode[] = [];
  if (isCancelledStatus(input.status)) {
    blockers.push(SALES_COMPLETION_BLOCKER_CODES.ORDER_CANCELLED);
    return blockers;
  }
  if (!COMPLETION_ELIGIBLE_STATUSES.has(input.status) && !isCompletedStatus(input.status)) {
    if (input.status === SALES_ORDER_STATUS_CODES.CONFIRMED) {
      blockers.push(SALES_COMPLETION_BLOCKER_CODES.NO_FULFILMENT_ACTIVITY);
    } else {
      blockers.push(SALES_COMPLETION_BLOCKER_CODES.ORDER_NOT_ELIGIBLE);
    }
  }
  const totals = sumLineQuantities(input.lines);
  if (totals.outstanding > 0) {
    blockers.push(SALES_COMPLETION_BLOCKER_CODES.OUTSTANDING_QUANTITY);
  }
  if (input.lines.some((line) => line.accepted > line.ordered)) {
    blockers.push(SALES_COMPLETION_BLOCKER_CODES.ACCEPTED_EXCEEDS_ORDERED);
  }
  if (
    input.lines.some(
      (line) => line.inspectionStatus === SALES_INSPECTION_STATUS_CODES.PENDING
    )
  ) {
    blockers.push(SALES_COMPLETION_BLOCKER_CODES.INSPECTION_PENDING);
  }
  if (
    input.lines.some(
      (line) => line.inspectionStatus === SALES_INSPECTION_STATUS_CODES.FAILED
    )
  ) {
    blockers.push(SALES_COMPLETION_BLOCKER_CODES.INSPECTION_FAILED);
  }
  if (
    input.lines.some(
      (line) =>
        line.serviceCompletionStatus ===
        SALES_SERVICE_COMPLETION_STATUS_CODES.PENDING
    )
  ) {
    blockers.push(SALES_COMPLETION_BLOCKER_CODES.SERVICE_INCOMPLETE);
  }
  if (input.lines.some((line) => line.openRejected > 0)) {
    blockers.push(SALES_COMPLETION_BLOCKER_CODES.DISPOSITION_REQUIRED);
  }
  if (input.lines.some((line) => line.evidenceMissing)) {
    blockers.push(SALES_COMPLETION_BLOCKER_CODES.EVIDENCE_MISSING);
  }
  if (!input.checklistPassed) {
    blockers.push(SALES_COMPLETION_BLOCKER_CODES.CHECKLIST_FAILED);
    for (const extra of input.checklistBlockers ?? []) {
      if (
        extra !== SALES_COMPLETION_BLOCKER_CODES.CHECKLIST_FAILED &&
        !blockers.includes(extra as SalesCompletionBlockerCode)
      ) {
        blockers.push(extra as SalesCompletionBlockerCode);
      }
    }
  }
  return [...new Set(blockers)];
}

export function completionBlockerLabel(
  code: string,
  totals: SalesLineQuantityView
): string {
  switch (code) {
    case SALES_COMPLETION_BLOCKER_CODES.OUTSTANDING_QUANTITY:
      return `${formatQuantity(totals.outstanding)} unit${totals.outstanding === 1 ? "" : "s"} remain outstanding`;
    case SALES_COMPLETION_BLOCKER_CODES.INSPECTION_PENDING:
      return "Inspection is pending";
    case SALES_COMPLETION_BLOCKER_CODES.INSPECTION_FAILED:
      return "Inspection did not pass";
    case SALES_COMPLETION_BLOCKER_CODES.SERVICE_INCOMPLETE:
      return "Required service work is not finished";
    case SALES_COMPLETION_BLOCKER_CODES.DISPOSITION_REQUIRED:
      return `${formatQuantity(totals.openRejected)} rejected unit${totals.openRejected === 1 ? "" : "s"} still need a decision`;
    case SALES_COMPLETION_BLOCKER_CODES.EVIDENCE_MISSING:
      return "Required proof of delivery or service is missing";
    case SALES_COMPLETION_BLOCKER_CODES.CHECKLIST_FAILED:
      return "Required completion checks are not finished";
    case SALES_COMPLETION_BLOCKER_CODES.SOD_REQUIRED:
      return "Another authorised person must complete this sale";
    case SALES_COMPLETION_BLOCKER_CODES.ORDER_CANCELLED:
      return "This sale is cancelled";
    case SALES_COMPLETION_BLOCKER_CODES.NO_FULFILMENT_ACTIVITY:
      return "Delivery or service work has not started";
    case SALES_COMPLETION_BLOCKER_CODES.ACCEPTED_EXCEEDS_ORDERED:
      return "Accepted quantity cannot exceed the ordered quantity";
    default:
      return "This sale cannot be completed yet";
  }
}

export function buildCompletionReadiness(input: {
  status: string;
  lines: DerivedLineFulfilment[];
  checklistPassed: boolean;
  checklistBlockers?: string[];
  sodRequired: boolean;
  sodPending: boolean;
}): SalesCompletionReadinessView {
  const blockers = evaluateCompletionBlockers(input);
  const totals = sumLineQuantities(input.lines);
  const operationalClear = blockers.length === 0;
  const eligible = operationalClear && !input.sodPending;
  const displayBlockers = [...blockers];
  if (operationalClear && input.sodRequired && input.sodPending) {
    displayBlockers.push(SALES_COMPLETION_BLOCKER_CODES.SOD_REQUIRED);
  }
  return {
    eligible,
    completionBlocked: !eligible,
    blockers: displayBlockers,
    blockerLabels: displayBlockers.map((code) => completionBlockerLabel(code, totals)),
    sodRequired: input.sodRequired,
    sodPending: input.sodPending,
  };
}

export function buildNextActionReadiness(input: {
  status: string;
  lines: DerivedLineFulfilment[];
  completion: SalesCompletionReadinessView;
}): SalesNextActionReadiness {
  const inspectionPending = input.lines.some(
    (line) => line.inspectionStatus === SALES_INSPECTION_STATUS_CODES.PENDING
  );
  return {
    readyForDelivery: isFulfilmentEligibleStatus(input.status),
    readyForInspection:
      isFulfilmentEligibleStatus(input.status) &&
      (inspectionPending || input.lines.some((line) => line.delivered > 0)),
    readyForCompletion: input.completion.eligible,
    completionBlocked: input.completion.completionBlocked,
    completionBlockers: [...input.completion.blockers],
    readyForCancellation: CANCELLATION_ELIGIBLE_STATUSES.has(input.status),
  };
}

export function nextActionForLifecycle(input: {
  status: string;
  confirmationRequiresSod: boolean;
  completion: SalesCompletionReadinessView;
}): string {
  if (input.status === SALES_ORDER_STATUS_CODES.DRAFT) {
    return input.confirmationRequiresSod
      ? "Review the expected total, then submit this sale for confirmation."
      : "Review the expected total, then confirm this sale.";
  }
  if (input.status === SALES_ORDER_STATUS_CODES.SUBMITTED_FOR_CONFIRMATION) {
    return "Another authorised person must confirm this sale.";
  }
  if (isCancelledStatus(input.status)) {
    return "This sale is cancelled. Delivery cannot continue.";
  }
  if (isCompletedStatus(input.status)) {
    return "This sale is completed. Payment is not yet recorded.";
  }
  if (input.status === SALES_ORDER_STATUS_CODES.CONFIRMED) {
    return "Payment is not yet recorded. Delivery and inspection will be recorded next.";
  }
  if (input.completion.eligible) {
    return input.completion.sodRequired
      ? "Review outstanding items, then request completion."
      : "Review outstanding items, then complete this sale.";
  }
  if (input.completion.sodPending) {
    return "Another authorised person must complete this sale.";
  }
  if (input.completion.blockerLabels.length > 0) {
    return `Completion blocked. ${input.completion.blockerLabels[0]}.`;
  }
  return "Open the sale to see the next action.";
}

export function assertCompletionEligible(readiness: SalesCompletionReadinessView): void {
  const operationalBlockers = readiness.blockers.filter(
    (code) => code !== SALES_COMPLETION_BLOCKER_CODES.SOD_REQUIRED
  );
  if (operationalBlockers.length > 0) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.COMPLETION_BLOCKED,
      `Completion blocked. ${readiness.blockerLabels.join("; ")}.`,
      409,
      {
        field: "status",
        entity: "sale",
        nextAction: readiness.blockerLabels[0]
          ? `Resolve: ${readiness.blockerLabels.join("; ")}.`
          : SALES_USER_MESSAGES.COMPLETION_BLOCKED,
      }
    );
  }
}
