/**
 * Purpose:
 * Pure BP-006 IP-05 downstream contract mapping and workspace SoD helpers.
 * Does not collect payment, move stock, or schedule resources.
 *
 * Implementation Package:
 * BP-006 / IP-05 – Downstream Handoff & Sales Workspace
 */

import {
  SALES_DISPOSITION_TYPES,
  SALES_FINANCIAL_INSTRUCTION_TYPES,
  SALES_INSPECTION_STATUS_CODES,
  SALES_INSTRUCTION_STATUS_CODES,
  SALES_ORDER_SOURCE_TYPES,
  SALES_ORDER_STATUS_CODES,
  SALES_PAYMENT_AVAILABILITY_LABEL,
  SALES_SERVICE_COMPLETION_STATUS_CODES,
} from "@/modules/sales/constants";
import { SalesOrderError, SALES_ERROR_CODES } from "@/modules/sales/errors";
import type {
  BookingHandoffContract,
  FinancialInstructionContract,
  InventoryFulfilmentHandoffContract,
  PaymentReadyOrderContract,
  SalesDispositionInstructionView,
  SalesOperationalNoteView,
  SalesOrderDetailView,
  StockReturnInstructionContract,
} from "@/modules/sales/types";

const NOTE_METADATA_KEY = "operationalNotes";

export function paymentStatusLabel(): string {
  return SALES_PAYMENT_AVAILABILITY_LABEL;
}

export function financialInstructionTypeForOrder(
  detail: Pick<SalesOrderDetailView, "status" | "dispositions">
): string {
  if (detail.status === SALES_ORDER_STATUS_CODES.CANCELLED) {
    return SALES_FINANCIAL_INSTRUCTION_TYPES.CANCEL;
  }
  const approved = (detail.dispositions ?? []).filter(
    (row) => row.status === SALES_INSTRUCTION_STATUS_CODES.APPROVED
  );
  if (approved.some((row) => row.instructionType === SALES_DISPOSITION_TYPES.CANCEL)) {
    return SALES_FINANCIAL_INSTRUCTION_TYPES.CANCEL;
  }
  if (
    approved.some(
      (row) =>
        row.instructionType === SALES_DISPOSITION_TYPES.RETURN_CREDIT ||
        row.instructionType === SALES_DISPOSITION_TYPES.RETURN_REPLACE ||
        row.instructionType === SALES_DISPOSITION_TYPES.REPLACE
    )
  ) {
    return SALES_FINANCIAL_INSTRUCTION_TYPES.RETURN;
  }
  if (
    detail.status === SALES_ORDER_STATUS_CODES.DRAFT ||
    detail.status === SALES_ORDER_STATUS_CODES.SUBMITTED_FOR_CONFIRMATION
  ) {
    return SALES_FINANCIAL_INSTRUCTION_TYPES.NONE;
  }
  return SALES_FINANCIAL_INSTRUCTION_TYPES.SALE;
}

export function toPaymentReadyContract(
  detail: SalesOrderDetailView
): PaymentReadyOrderContract {
  return {
    orderId: detail.id,
    orderNumber: detail.orderNumber,
    businessId: detail.businessId,
    customerId: detail.customerId,
    expectedAmount: detail.expectedAmount,
    currency: detail.currencyCode,
    commercialContractId: detail.commercialContractId,
    snapshotId: detail.snapshotId,
    operationalStatus: detail.status,
    financialInstructionType: financialInstructionTypeForOrder(detail),
    paymentStatus: "NOT_RECORDED",
    paymentRecorded: false,
    paymentCollectionAvailable: false,
    collectedAmount: null,
    tenderSplit: null,
    lines: detail.lines.map((line) => ({
      orderLineId: line.id,
      offeringId: line.offeringId,
      expectedPayable: line.commercialLineAmount,
      currencyCode: line.currencyCode,
      components: line.commercialBreakdown ?? [],
    })),
  };
}

function returnReplaceQuantity(
  dispositions: SalesDispositionInstructionView[],
  orderLineId: string
): string {
  const total = dispositions
    .filter(
      (row) =>
        row.orderLineId === orderLineId &&
        row.status === SALES_INSTRUCTION_STATUS_CODES.APPROVED &&
        (row.instructionType === SALES_DISPOSITION_TYPES.RETURN_REPLACE ||
          row.instructionType === SALES_DISPOSITION_TYPES.REPLACE)
    )
    .reduce((sum, row) => sum + Number(row.quantity), 0);
  return String(total);
}

export function toFulfilmentHandoffContract(
  detail: SalesOrderDetailView
): InventoryFulfilmentHandoffContract {
  return {
    orderId: detail.id,
    orderNumber: detail.orderNumber,
    businessId: detail.businessId,
    customerId: detail.customerId,
    inventoryExecuted: false,
    stockMoved: false,
    stockOnHand: null,
    lines: detail.lines.map((line) => ({
      orderLineId: line.id,
      offeringId: line.offeringId,
      description: line.description,
      orderedQuantity: line.orderedQuantity,
      // BP-006 does not persist a sale-line UOM. The field is on the
      // handoff so inventory can consume an explicit UOM when present.
      // Inventory must never treat a missing value as purchase UOM.
      salesUomId: null,
      deliveredQuantity: line.deliveredQuantity,
      acceptedQuantity: line.acceptedQuantity,
      rejectedQuantity: line.rejectedQuantity,
      missingQuantity: line.missingQuantity,
      outstandingQuantity: line.outstandingQuantity,
      lineType: line.lineType,
      inspectionStatus: line.inspectionStatus,
      fulfilmentStatus: line.fulfilmentStatus,
      returnReplaceQuantity: returnReplaceQuantity(detail.dispositions ?? [], line.id),
    })),
  };
}

export function toBookingHandoffContract(
  detail: SalesOrderDetailView
): BookingHandoffContract {
  return {
    orderId: detail.id,
    orderNumber: detail.orderNumber,
    businessId: detail.businessId,
    schedulerExecuted: false,
    lines: detail.lines.map((line) => ({
      orderLineId: line.id,
      offeringId: line.offeringId,
      lineType: line.lineType,
    })),
  };
}

export function toFinancialInstructionContract(
  detail: SalesOrderDetailView
): FinancialInstructionContract {
  return {
    orderId: detail.id,
    orderNumber: detail.orderNumber,
    businessId: detail.businessId,
    instructionType: financialInstructionTypeForOrder(detail),
    expectedAmount: detail.expectedAmount,
    currency: detail.currencyCode,
    refundExecuted: false,
    paymentRecorded: false,
  };
}

export function toStockReturnInstructionContract(
  detail: SalesOrderDetailView
): StockReturnInstructionContract {
  return {
    orderId: detail.id,
    orderNumber: detail.orderNumber,
    businessId: detail.businessId,
    inventoryExecuted: false,
    stockMoved: false,
    lines: (detail.dispositions ?? [])
      .filter(
        (row) =>
          row.status === SALES_INSTRUCTION_STATUS_CODES.APPROVED &&
          row.stockInstructionEmitted &&
          row.orderLineId
      )
      .map((row) => ({
        orderLineId: row.orderLineId!,
        quantity: row.quantity,
        instructionType: row.instructionType,
      })),
  };
}

export function canCheckerApprove(input: {
  sodRequired: boolean;
  submittedBy?: string | null;
  viewerUserId?: string | null;
}): boolean {
  if (!input.sodRequired) {
    return true;
  }
  if (!input.submittedBy || !input.viewerUserId) {
    return true;
  }
  return input.submittedBy !== input.viewerUserId;
}

export function parseOperationalNotes(
  metadata: Record<string, unknown> | null | undefined
): SalesOperationalNoteView[] {
  const raw = metadata?.[NOTE_METADATA_KEY];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((row): row is SalesOperationalNoteView => {
      return (
        Boolean(row) &&
        typeof row === "object" &&
        typeof (row as SalesOperationalNoteView).id === "string" &&
        typeof (row as SalesOperationalNoteView).body === "string"
      );
    })
    .map((row) => ({
      id: row.id,
      orderLineId: row.orderLineId ?? null,
      body: row.body,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    }));
}

export function appendOperationalNote(
  metadata: Record<string, unknown> | null | undefined,
  note: SalesOperationalNoteView
): Record<string, unknown> {
  const current = parseOperationalNotes(metadata);
  return {
    ...(metadata ?? {}),
    [NOTE_METADATA_KEY]: [...current, note],
  };
}

export function assertOperationalNoteBody(body?: string | null): string {
  const trimmed = body?.trim() ?? "";
  if (!trimmed) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.INVALID_INPUT,
      "Add a note before saving.",
      400,
      { field: "body", entity: "note" }
    );
  }
  if (trimmed.length > 2000) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.INVALID_INPUT,
      "Keep the note within 2,000 characters.",
      400,
      { field: "body", entity: "note" }
    );
  }
  return trimmed;
}

export function workspaceFlags(input: {
  status: string;
  sourceType: string;
  inspectionPending: boolean;
  serviceRemaining: boolean;
  outstandingQuantity: number;
}) {
  return {
    outstandingFulfilment:
      input.outstandingQuantity > 0 &&
      input.status !== SALES_ORDER_STATUS_CODES.CANCELLED &&
      input.status !== SALES_ORDER_STATUS_CODES.DRAFT &&
      input.status !== SALES_ORDER_STATUS_CODES.SUBMITTED_FOR_CONFIRMATION,
    partial: input.status === SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED,
    inspectionPending: input.inspectionPending,
    serviceRemaining: input.serviceRemaining,
    cancelled: input.status === SALES_ORDER_STATUS_CODES.CANCELLED,
    convertedFromQuote: input.sourceType === SALES_ORDER_SOURCE_TYPES.QUOTATION,
  };
}

export function isInspectionPendingStatus(status: string): boolean {
  return status === SALES_INSPECTION_STATUS_CODES.PENDING;
}

export function isServiceRemainingStatus(status: string): boolean {
  return status === SALES_SERVICE_COMPLETION_STATUS_CODES.PENDING;
}
