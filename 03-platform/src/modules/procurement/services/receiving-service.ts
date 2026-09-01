/**
 * Purpose:
 * Orchestrate BP-009 IP-08 receipts, fulfilment facts, and downstream handoffs.
 * Does not maintain inventory on-hand balances.
 */

import { randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  DOCUMENT_NUMBERING_DOCUMENT_TYPES,
  DocumentNumberingError,
  type DocumentNumberingPort,
} from "@/core/localization-regulatory/document-numbering";
import { ConfigurableDocumentNumberingService } from "@/core/localization-regulatory/services/document-numbering-service";
import { createDocumentNumberingPolicyRepository } from "@/core/localization-regulatory/repositories/document-numbering-policy-repository";
import {
  INSPECTION_STATUSES,
  LINE_FULFILMENT_STATUSES,
  PO_FULFILMENT_STATUSES,
  PO_STATUSES,
  DISCREPANCY_TYPES,
  EXCEPTION_OBJECT_TYPES,
  EXCEPTION_RAISED_FROM,
  PERFORMANCE_MEASURE_CODES,
  PERFORMANCE_SOURCE_TYPES,
  PROCUREMENT_AUDIT_ACTIONS,
  PROCUREMENT_PERMISSIONS,
  RECEIPT_HANDOFF_STATUSES,
  RECEIPT_HANDOFF_TYPES,
  RECEIPT_STATUSES,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type {
  ProcurementAssetHandoffPort,
  ProcurementAuditPort,
  ProcurementExceptionBridgePort,
  ProcurementInventoryHandoffPort,
  ProcurementPerformanceBridgePort,
  PurchaseOrderStorePort,
  ReceivingControlPort,
  ReceivingStorePort,
  SuggestedSupplierPort,
} from "@/modules/procurement/ports";
import { createProcurementAuditAdapter } from "@/modules/procurement/services/procurement-audit-helper";
import { assertPermission } from "@/modules/procurement/services/procurement-rules";
import {
  assertPoEligibleForReceipt,
  assertPositiveReceiptQuantity,
  assertOverReceiptPolicy,
  buildHandoffIdempotencyKey,
  computeOutstandingQuantity,
  deriveLineFulfilmentStatus,
  derivePoFulfilmentStatus,
  documentTypeForReceipt,
  isConfirmedReceiptStatus,
  receiptTypeForLineType,
  requiresAssetHandoff,
  requiresInventoryHandoff,
  serviceReceiptRequiresPeriod,
  sumReceivedQuantities,
} from "@/modules/procurement/services/receiving-rules";
import type {
  CreateReceiptCommand,
  PoFulfilmentSummaryView,
  PoLineFulfilmentView,
  PoLineRecord,
  ProcurementActor,
  PurchaseOrderRecord,
  ReceiptDecisionCommand,
  ReceiptListView,
  ReceiptView,
  RecordDiscrepancyCommand,
  RecordInspectionCommand,
} from "@/modules/procurement/types";
import type { PurchaseOrderService } from "@/modules/procurement/services/purchase-order-service";
import { createPurchaseOrderRepository } from "@/modules/procurement/repositories/purchase-order-repository";
import {
  createInProcessAssetHandoffAdapter,
  createInProcessInventoryHandoffAdapter,
} from "@/modules/procurement/adapters/procurement-inventory-handoff-adapter";
import {
  createReceivingControlRepository,
  createReceivingRepository,
} from "@/modules/procurement/repositories/receiving-repository";
import { createSuggestedSupplierAdapter } from "@/modules/procurement/adapters/suggested-supplier-adapter";
import { mapDiscrepancyToExceptionType } from "@/modules/procurement/services/exception-rules";
import { createProcurementExceptionBridge } from "@/modules/procurement/services/exception-service";
import { createProcurementPerformanceBridge } from "@/modules/procurement/services/performance-service";

export type ReceivingServiceDependencies = {
  store: ReceivingStorePort;
  poStore: PurchaseOrderStorePort;
  controls: ReceivingControlPort;
  numbering: DocumentNumberingPort;
  audit: ProcurementAuditPort;
  suggestedSupplier: SuggestedSupplierPort;
  inventoryHandoff: ProcurementInventoryHandoffPort;
  assetHandoff: ProcurementAssetHandoffPort;
  purchaseOrders?: Pick<PurchaseOrderService, "recordFulfilmentEvent">;
  exceptions?: ProcurementExceptionBridgePort;
  performance?: ProcurementPerformanceBridgePort;
};

function actorId(context: CurrentBusinessContext) {
  return context.platformUserId || null;
}

function requireReceipt<T>(row: T | null): T {
  if (!row) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.RECEIPT_NOT_FOUND, undefined, 404);
  }
  return row;
}

function requirePo<T>(row: T | null): T {
  if (!row) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_NOT_FOUND, undefined, 404);
  }
  return row;
}

function receiptStatusLabel(status: string) {
  switch (status) {
    case RECEIPT_STATUSES.DRAFT:
      return "Draft";
    case RECEIPT_STATUSES.SUBMITTED:
      return "Submitted";
    case RECEIPT_STATUSES.CONFIRMED:
      return "Confirmed";
    case RECEIPT_STATUSES.REJECTED:
      return "Rejected";
    default:
      return status;
  }
}

function fulfilmentStatusLabel(status: string) {
  switch (status) {
    case LINE_FULFILMENT_STATUSES.NOT_RECEIVED:
      return "Not received";
    case LINE_FULFILMENT_STATUSES.PARTIALLY_FULFILLED:
      return "Partially fulfilled";
    case LINE_FULFILMENT_STATUSES.FULFILLED:
      return "Fulfilled";
    case LINE_FULFILMENT_STATUSES.OVERDUE:
      return "Overdue";
    case PO_FULFILMENT_STATUSES.NOT_FULFILLED:
      return "Not fulfilled";
    case PO_FULFILMENT_STATUSES.PARTIALLY_FULFILLED:
      return "Partially fulfilled";
    case PO_FULFILMENT_STATUSES.FULFILLED:
      return "Fulfilled";
    default:
      return status;
  }
}

export class ReceivingService {
  constructor(private readonly deps: ReceivingServiceDependencies) {}

  async list(
    context: CurrentBusinessContext,
    actor: ProcurementActor
  ): Promise<ReceiptListView[]> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.RECEIVING_READ);
    const rows = await this.deps.store.listReceiptsByBusiness(context.businessId);
    const views: ReceiptListView[] = [];
    for (const row of rows) {
      views.push(await this.toListView(context, row));
    }
    return views.sort((a, b) => b.receiptDate.localeCompare(a.receiptDate));
  }

  async get(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    receiptId: string
  ): Promise<ReceiptView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.RECEIVING_READ);
    return this.toView(context, receiptId);
  }

  async getPOFulfilmentSummary(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    purchaseOrderId: string
  ): Promise<PoFulfilmentSummaryView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.RECEIVING_READ);
    const po = requirePo(await this.deps.poStore.findById(context.businessId, purchaseOrderId));
    const versionId = po.acceptedVersionId ?? po.currentVersionId;
    if (!versionId) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_VERSION_INVALID, undefined, 409);
    }
    const lines = await this.deps.poStore.listLines(versionId);
    const lineViews: PoLineFulfilmentView[] = [];
    for (const line of lines) {
      lineViews.push(await this.buildLineFulfilment(context.businessId, line));
    }
    const receipts = await this.deps.store.listReceiptsByPurchaseOrder(
      context.businessId,
      purchaseOrderId
    );
    return {
      purchaseOrderId: po.id,
      poNumber: po.poNumber,
      fulfilmentStatus: derivePoFulfilmentStatus(lineViews.map((row) => row.fulfilmentStatus)),
      fulfilmentStatusLabel: fulfilmentStatusLabel(
        derivePoFulfilmentStatus(lineViews.map((row) => row.fulfilmentStatus))
      ),
      lines: lineViews,
      receipts: await Promise.all(
        receipts.map(async (row) => ({
          id: row.id,
          receiptNumber: row.receiptNumber,
          receiptType: row.receiptType,
          status: row.status,
          receiptDate: row.receiptDate,
          handoffStatus: await this.resolveReceiptHandoffStatus(row.id),
        }))
      ),
    };
  }

  async createReceipt(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    input: CreateReceiptCommand
  ): Promise<ReceiptView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.RECEIVING_CREATE);
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    const po = requirePo(
      await this.deps.poStore.findById(context.businessId, input.purchaseOrderId.trim())
    );
    assertPoEligibleForReceipt(po.status, control.requiresSupplierAcceptance);
    const versionId = po.acceptedVersionId ?? po.currentVersionId;
    if (!versionId) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_VERSION_INVALID, undefined, 409);
    }
    const poLines = await this.deps.poStore.listLines(versionId);
    const lineMap = new Map(poLines.map((row) => [row.id, row]));
    if (input.lines.length === 0) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "lines",
      });
    }
    const preparedLines = input.lines.map((line, index) => {
      assertPositiveReceiptQuantity(line.quantityReceived);
      const poLine = lineMap.get(line.poLineId.trim());
      if (!poLine) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_LINE_NOT_FOUND, undefined, 404);
      }
      return { input: line, poLine, index };
    });
    const receiptType = receiptTypeForLineType(preparedLines[0]!.poLine.lineType);
    if (serviceReceiptRequiresPeriod(receiptType) && (!input.servicePeriodStart || !input.servicePeriodEnd)) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "servicePeriodStart",
      });
    }
    const allocated = await this.allocateReceiptNumber(context.businessId, receiptType);
    const receiptId = randomUUID();
    const receiptDate = input.receiptDate?.trim() || new Date().toISOString().slice(0, 10);
    const initialStatus = control.requiresReceiptConfirmation
      ? RECEIPT_STATUSES.DRAFT
      : RECEIPT_STATUSES.SUBMITTED;
    await this.deps.store.insertReceipt({
      id: receiptId,
      businessId: context.businessId,
      receiptNumber: allocated.number,
      receiptType,
      status: initialStatus,
      purchaseOrderId: po.id,
      purchaseOrderVersionId: versionId,
      profileId: po.profileId,
      receiptDate,
      receiverUserId: actorId(context),
      deliveryLocation: input.deliveryLocation?.trim() || po.deliveryLocation,
      inspectionStatus: input.inspectionStatus?.trim() || INSPECTION_STATUSES.NOT_REQUIRED,
      inspectionNotes: null,
      inspectedAt: null,
      inspectedBy: null,
      servicePeriodStart: input.servicePeriodStart ?? null,
      servicePeriodEnd: input.servicePeriodEnd ?? null,
      assetCondition: input.assetCondition?.trim() || null,
      comments: input.comments?.trim() || null,
      evidenceDocumentId: input.evidenceDocumentId?.trim() || null,
      overDeliveryFlag: false,
      submittedAt: initialStatus === RECEIPT_STATUSES.SUBMITTED ? new Date() : null,
      submittedBy: initialStatus === RECEIPT_STATUSES.SUBMITTED ? actorId(context) : null,
      confirmedAt: null,
      confirmedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.deps.store.insertReceiptLines(
      preparedLines.map(({ input: line, poLine, index }) => ({
        id: randomUUID(),
        businessId: context.businessId,
        receiptId,
        poLineId: poLine.id,
        lineType: poLine.lineType,
        sequence: index + 1,
        description: poLine.description,
        quantityReceived: line.quantityReceived.trim(),
        uom: poLine.uom,
        catalogueItemId: poLine.catalogueItemId,
        stockItemId: line.stockItemId?.trim() || null,
        discrepancyType: line.discrepancyType?.trim() || null,
        discrepancyDescription: line.discrepancyDescription?.trim() || null,
        damageFlag: line.damageFlag ?? false,
      }))
    );
    await this.audit(context, receiptId, PROCUREMENT_AUDIT_ACTIONS.RECEIPT_CREATED, {
      purchaseOrderId: po.id,
      receiptType,
    });
    if (!control.requiresReceiptConfirmation) {
      return this.confirmReceipt(context, actor, receiptId);
    }
    return this.toView(context, receiptId);
  }

  async confirmReceipt(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    receiptId: string
  ): Promise<ReceiptView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.RECEIVING_CONFIRM);
    const receipt = requireReceipt(
      await this.deps.store.findReceiptById(context.businessId, receiptId)
    );
    if (receipt.status === RECEIPT_STATUSES.CONFIRMED) {
      return this.toView(context, receiptId);
    }
    if (
      receipt.status !== RECEIPT_STATUSES.DRAFT &&
      receipt.status !== RECEIPT_STATUSES.SUBMITTED
    ) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.RECEIPT_NOT_EDITABLE, undefined, 409);
    }
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    const po = requirePo(
      await this.deps.poStore.findById(context.businessId, receipt.purchaseOrderId)
    );
    assertPoEligibleForReceipt(po.status, control.requiresSupplierAcceptance);
    const lines = await this.deps.store.listReceiptLines(receiptId);
    let overDelivery = false;
    for (const line of lines) {
      const poLine = requirePo(
        (await this.deps.poStore.listLines(receipt.purchaseOrderVersionId)).find(
          (row) => row.id === line.poLineId
        ) ?? null
      );
      const prior = await this.deps.store.listConfirmedReceiptLinesByPoLine(
        context.businessId,
        line.poLineId
      );
      const outstanding = computeOutstandingQuantity(
        poLine.quantity,
        prior.map((row) => row.quantityReceived)
      );
      const policy = assertOverReceiptPolicy({
        policy: control.overReceiptPolicy,
        outstandingQuantity: outstanding,
        quantityReceived: line.quantityReceived,
      });
      if (policy.overDelivery) {
        overDelivery = true;
        await this.audit(context, receiptId, PROCUREMENT_AUDIT_ACTIONS.OVER_DELIVERY_FLAGGED, {
          poLineId: line.poLineId,
        });
        await this.raiseReceiptException(context, receipt, {
          sourceKey: `receipt:${receiptId}:over-delivery:${line.poLineId}`,
          exceptionTypeCode: mapDiscrepancyToExceptionType("OVER_DELIVERY"),
          title: `Over-delivery on PO line ${line.description}`,
          description: `Received ${line.quantityReceived} against outstanding ${outstanding}.`,
        });
      }
      if (line.discrepancyType) {
        await this.audit(context, receiptId, PROCUREMENT_AUDIT_ACTIONS.DISCREPANCY_RECORDED, {
          poLineId: line.poLineId,
          discrepancyType: line.discrepancyType,
        });
      }
    }
    await this.deps.store.updateReceipt(context.businessId, receiptId, {
      status: RECEIPT_STATUSES.CONFIRMED,
      overDeliveryFlag: overDelivery,
      confirmedAt: new Date(),
      confirmedBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.audit(context, receiptId, PROCUREMENT_AUDIT_ACTIONS.RECEIPT_CONFIRMED, {
      purchaseOrderId: receipt.purchaseOrderId,
    });
    for (const line of lines) {
      const poLine = requirePo(
        (await this.deps.poStore.listLines(receipt.purchaseOrderVersionId)).find(
          (row) => row.id === line.poLineId
        ) ?? null
      );
      const onTime =
        !poLine.promisedDeliveryDate || receipt.receiptDate <= poLine.promisedDeliveryDate;
      await this.recordReceiptPerformance(context, receipt, {
        sourceKey: `receipt:${receiptId}:delivery:${line.poLineId}`,
        measureCode: onTime
          ? PERFORMANCE_MEASURE_CODES.DELIVERY_ON_TIME
          : PERFORMANCE_MEASURE_CODES.DELIVERY_LATE,
        sourceId: receiptId,
      });
      if (line.discrepancyType) {
        await this.recordReceiptPerformance(context, receipt, {
          sourceKey: `receipt:${receiptId}:perf:discrepancy:${line.id}`,
          measureCode:
            line.discrepancyType === DISCREPANCY_TYPES.DAMAGED
              ? PERFORMANCE_MEASURE_CODES.QUALITY_REJECTION
              : line.discrepancyType === DISCREPANCY_TYPES.OVER_DELIVERY
                ? PERFORMANCE_MEASURE_CODES.FULFILMENT_OVER
                : PERFORMANCE_MEASURE_CODES.FULFILMENT_PARTIAL,
          sourceId: receiptId,
        });
      }
    }
    if (requiresInventoryHandoff(receipt.receiptType)) {
      await this.processInventoryHandoffs(context, receipt);
    } else if (requiresAssetHandoff(receipt.receiptType)) {
      await this.processAssetHandoffs(context, receipt);
    } else {
      await this.audit(context, receiptId, PROCUREMENT_AUDIT_ACTIONS.SERVICE_CONFIRMED, {});
    }
    await this.syncPoFulfilment(context, actor, po.id);
    return this.toView(context, receiptId);
  }

  async rejectReceipt(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    receiptId: string,
    input: ReceiptDecisionCommand
  ): Promise<ReceiptView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.RECEIVING_REJECT);
    const receipt = requireReceipt(
      await this.deps.store.findReceiptById(context.businessId, receiptId)
    );
    const reason = input.reason?.trim();
    if (!reason) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.DECISION_REASON_REQUIRED, undefined, 400);
    }
    await this.deps.store.updateReceipt(context.businessId, receiptId, {
      status: RECEIPT_STATUSES.REJECTED,
      rejectedAt: new Date(),
      rejectedBy: actorId(context),
      rejectionReason: reason,
      updatedBy: actorId(context),
    });
    await this.audit(context, receiptId, PROCUREMENT_AUDIT_ACTIONS.RECEIPT_REJECTED, { reason });
    return this.toView(context, receiptId);
  }

  async recordInspection(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    receiptId: string,
    input: RecordInspectionCommand
  ): Promise<ReceiptView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.RECEIVING_INSPECTION);
    requireReceipt(await this.deps.store.findReceiptById(context.businessId, receiptId));
    await this.deps.store.updateReceipt(context.businessId, receiptId, {
      inspectionStatus: input.inspectionStatus.trim(),
      inspectionNotes: input.inspectionNotes?.trim() || null,
      inspectedAt: new Date(),
      inspectedBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.audit(context, receiptId, PROCUREMENT_AUDIT_ACTIONS.INSPECTION_RECORDED, {
      inspectionStatus: input.inspectionStatus,
    });
    return this.toView(context, receiptId);
  }

  async recordDiscrepancy(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    receiptId: string,
    input: RecordDiscrepancyCommand
  ): Promise<ReceiptView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.RECEIVING_DISCREPANCY);
    const receipt = requireReceipt(
      await this.deps.store.findReceiptById(context.businessId, receiptId)
    );
    const lines = await this.deps.store.listReceiptLines(receiptId);
    const line = lines.find((row) => row.id === input.receiptLineId);
    if (!line) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 404, {
        field: "receiptLineId",
      });
    }
    const updatedLines = lines.map((row) =>
      row.id === line.id
        ? {
            ...row,
            discrepancyType: input.discrepancyType.trim(),
            discrepancyDescription: input.discrepancyDescription?.trim() || null,
            damageFlag: input.damageFlag ?? row.damageFlag,
          }
        : row
    );
    for (const updated of updatedLines) {
      await this.deps.store.updateReceiptLine(context.businessId, updated);
    }
    await this.audit(context, receiptId, PROCUREMENT_AUDIT_ACTIONS.DISCREPANCY_RECORDED, {
      receiptLineId: line.id,
      discrepancyType: input.discrepancyType,
    });
    await this.raiseReceiptException(context, receipt, {
      sourceKey: `receipt:${receiptId}:discrepancy:${line.id}`,
      exceptionTypeCode: mapDiscrepancyToExceptionType(input.discrepancyType),
      title: `Receipt discrepancy on ${line.description}`,
      description: input.discrepancyDescription ?? input.discrepancyType,
    });
    await this.recordReceiptPerformance(context, receipt, {
      sourceKey: `receipt:${receiptId}:perf:discrepancy:${line.id}`,
      measureCode:
        input.discrepancyType === DISCREPANCY_TYPES.DAMAGED
          ? PERFORMANCE_MEASURE_CODES.QUALITY_REJECTION
          : input.discrepancyType === DISCREPANCY_TYPES.OVER_DELIVERY
            ? PERFORMANCE_MEASURE_CODES.FULFILMENT_OVER
            : PERFORMANCE_MEASURE_CODES.FULFILMENT_PARTIAL,
      sourceId: receiptId,
    });
    return this.toView(context, receipt.id);
  }

  private async processInventoryHandoffs(
    context: CurrentBusinessContext,
    receipt: { id: string; businessId: string; purchaseOrderId: string; purchaseOrderVersionId: string; receiptDate: string; deliveryLocation: string | null; receiverUserId: string | null }
  ) {
    const lines = await this.deps.store.listReceiptLines(receipt.id);
    for (const line of lines) {
      const idempotencyKey = buildHandoffIdempotencyKey(
        receipt.id,
        line.id,
        RECEIPT_HANDOFF_TYPES.INVENTORY
      );
      const existing = await this.deps.store.findHandoffByIdempotencyKey(
        context.businessId,
        idempotencyKey
      );
      if (existing?.status === RECEIPT_HANDOFF_STATUSES.SUCCEEDED) {
        continue;
      }
      const handoffId = existing?.id ?? randomUUID();
      if (!existing) {
        await this.deps.store.insertHandoff({
          id: handoffId,
          businessId: context.businessId,
          receiptId: receipt.id,
          receiptLineId: line.id,
          handoffType: RECEIPT_HANDOFF_TYPES.INVENTORY,
          status: RECEIPT_HANDOFF_STATUSES.PENDING,
          idempotencyKey,
          downstreamSystem: "BP-008",
          downstreamReference: null,
          errorMessage: null,
          attemptedAt: new Date(),
          completedAt: null,
        });
        await this.audit(context, receipt.id, PROCUREMENT_AUDIT_ACTIONS.GOODS_HANDOFF_CREATED, {
          receiptLineId: line.id,
        });
      }
      const result = await this.deps.inventoryHandoff.processHandoff({
        businessId: context.businessId,
        receiptId: receipt.id,
        receiptLineId: line.id,
        purchaseOrderId: receipt.purchaseOrderId,
        purchaseOrderVersionId: receipt.purchaseOrderVersionId,
        poLineId: line.poLineId,
        catalogueItemId: line.catalogueItemId,
        stockItemId: line.stockItemId,
        quantity: line.quantityReceived,
        uom: line.uom,
        deliveryLocation: receipt.deliveryLocation,
        receiptDate: receipt.receiptDate,
        receiverUserId: receipt.receiverUserId,
        idempotencyKey,
      });
      await this.deps.store.updateHandoff(context.businessId, handoffId, {
        status: result.success
          ? RECEIPT_HANDOFF_STATUSES.SUCCEEDED
          : RECEIPT_HANDOFF_STATUSES.FAILED,
        downstreamReference: result.movementReference,
        errorMessage: result.errorMessage,
        completedAt: new Date(),
      });
      await this.audit(
        context,
        receipt.id,
        result.success
          ? PROCUREMENT_AUDIT_ACTIONS.GOODS_HANDOFF_SUCCEEDED
          : PROCUREMENT_AUDIT_ACTIONS.GOODS_HANDOFF_FAILED,
        {
          receiptLineId: line.id,
          downstreamReference: result.movementReference ?? "",
        }
      );
    }
  }

  private async processAssetHandoffs(
    context: CurrentBusinessContext,
    receipt: {
      id: string;
      businessId: string;
      purchaseOrderId: string;
      receiptDate: string;
      deliveryLocation: string | null;
      assetCondition: string | null;
    }
  ) {
    const lines = await this.deps.store.listReceiptLines(receipt.id);
    for (const line of lines) {
      const idempotencyKey = buildHandoffIdempotencyKey(
        receipt.id,
        line.id,
        RECEIPT_HANDOFF_TYPES.ASSET
      );
      const existing = await this.deps.store.findHandoffByIdempotencyKey(
        context.businessId,
        idempotencyKey
      );
      if (existing?.status === RECEIPT_HANDOFF_STATUSES.SUCCEEDED) {
        continue;
      }
      const handoffId = existing?.id ?? randomUUID();
      if (!existing) {
        await this.deps.store.insertHandoff({
          id: handoffId,
          businessId: context.businessId,
          receiptId: receipt.id,
          receiptLineId: line.id,
          handoffType: RECEIPT_HANDOFF_TYPES.ASSET,
          status: RECEIPT_HANDOFF_STATUSES.PENDING,
          idempotencyKey,
          downstreamSystem: "ASSET_FUTURE",
          downstreamReference: null,
          errorMessage: null,
          attemptedAt: new Date(),
          completedAt: null,
        });
        await this.audit(context, receipt.id, PROCUREMENT_AUDIT_ACTIONS.ASSET_HANDOFF_CREATED, {
          receiptLineId: line.id,
        });
      }
      const result = await this.deps.assetHandoff.processHandoff({
        businessId: context.businessId,
        receiptId: receipt.id,
        receiptLineId: line.id,
        purchaseOrderId: receipt.purchaseOrderId,
        poLineId: line.poLineId,
        description: line.description,
        quantity: line.quantityReceived,
        assetCondition: receipt.assetCondition,
        deliveryLocation: receipt.deliveryLocation,
        receiptDate: receipt.receiptDate,
        idempotencyKey,
      });
      await this.deps.store.updateHandoff(context.businessId, handoffId, {
        status: result.success
          ? RECEIPT_HANDOFF_STATUSES.SUCCEEDED
          : RECEIPT_HANDOFF_STATUSES.FAILED,
        downstreamReference: result.handoffReference,
        errorMessage: result.errorMessage,
        completedAt: new Date(),
      });
    }
  }

  private async syncPoFulfilment(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    purchaseOrderId: string
  ) {
    if (!this.deps.purchaseOrders) {
      return;
    }
    const summary = await this.getPOFulfilmentSummary(context, actor, purchaseOrderId);
    await this.deps.purchaseOrders.recordFulfilmentEvent(context, actor, purchaseOrderId, {
      fullyFulfilled: summary.fulfilmentStatus === PO_FULFILMENT_STATUSES.FULFILLED,
    });
  }

  private async buildLineFulfilment(businessId: string, line: PoLineRecord): Promise<PoLineFulfilmentView> {
    const confirmed = await this.deps.store.listConfirmedReceiptLinesByPoLine(businessId, line.id);
    const receivedQuantity = sumReceivedQuantities(confirmed.map((row) => row.quantityReceived));
    const outstandingQuantity = computeOutstandingQuantity(
      line.quantity,
      confirmed.map((row) => row.quantityReceived)
    );
    const fulfilmentStatus = deriveLineFulfilmentStatus({
      orderedQuantity: line.quantity,
      receivedQuantities: confirmed.map((row) => row.quantityReceived),
      promisedDeliveryDate: line.promisedDeliveryDate,
    });
    const receipts = await this.deps.store.listReceiptsByBusiness(businessId);
    let lastReceiptDate: string | null = null;
    for (const receipt of receipts) {
      if (!isConfirmedReceiptStatus(receipt.status)) {
        continue;
      }
      const lines = await this.deps.store.listReceiptLines(receipt.id);
      if (lines.some((row) => row.poLineId === line.id)) {
        if (!lastReceiptDate || receipt.receiptDate > lastReceiptDate) {
          lastReceiptDate = receipt.receiptDate;
        }
      }
    }
    return {
      poLineId: line.id,
      lineType: line.lineType,
      description: line.description,
      orderedQuantity: line.quantity,
      receivedQuantity,
      outstandingQuantity,
      promisedDeliveryDate: line.promisedDeliveryDate,
      lastReceiptDate,
      fulfilmentStatus,
      fulfilmentStatusLabel: fulfilmentStatusLabel(fulfilmentStatus),
      isOverdue: fulfilmentStatus === LINE_FULFILMENT_STATUSES.OVERDUE,
      receiptType: receiptTypeForLineType(line.lineType),
    };
  }

  private async resolveReceiptHandoffStatus(receiptId: string) {
    const handoffs = await this.deps.store.listHandoffsByReceipt(receiptId);
    if (handoffs.length === 0) {
      return null;
    }
    if (handoffs.some((row) => row.status === RECEIPT_HANDOFF_STATUSES.FAILED)) {
      return RECEIPT_HANDOFF_STATUSES.FAILED;
    }
    if (handoffs.every((row) => row.status === RECEIPT_HANDOFF_STATUSES.SUCCEEDED)) {
      return RECEIPT_HANDOFF_STATUSES.SUCCEEDED;
    }
    return RECEIPT_HANDOFF_STATUSES.PENDING;
  }

  private async toListView(
    context: CurrentBusinessContext,
    row: { id: string; receiptNumber: string; receiptType: string; status: string; purchaseOrderId: string; profileId: string; receiptDate: string; receiverUserId: string | null; inspectionStatus: string }
  ): Promise<ReceiptListView> {
    const po = await this.deps.poStore.findById(context.businessId, row.purchaseOrderId);
    const supplier = await this.deps.suggestedSupplier.resolve(context.businessId, row.profileId);
    const lines = await this.deps.store.listReceiptLines(row.id);
    return {
      id: row.id,
      receiptNumber: row.receiptNumber,
      receiptType: row.receiptType,
      status: row.status,
      statusLabel: receiptStatusLabel(row.status),
      purchaseOrderId: row.purchaseOrderId,
      poNumber: po?.poNumber ?? row.purchaseOrderId,
      supplierName: supplier?.party.displayName ?? "Supplier",
      receiptDate: row.receiptDate,
      receiverName: row.receiverUserId,
      handoffStatus: await this.resolveReceiptHandoffStatus(row.id),
      inspectionStatus: row.inspectionStatus,
      hasDiscrepancy: lines.some((line) => Boolean(line.discrepancyType)),
    };
  }

  private async toView(context: CurrentBusinessContext, receiptId: string): Promise<ReceiptView> {
    const row = requireReceipt(
      await this.deps.store.findReceiptById(context.businessId, receiptId)
    );
    const po = requirePo(await this.deps.poStore.findById(context.businessId, row.purchaseOrderId));
    const supplier = await this.deps.suggestedSupplier.resolve(context.businessId, row.profileId);
    const lines = await this.deps.store.listReceiptLines(receiptId);
    const handoffs = await this.deps.store.listHandoffsByReceipt(receiptId);
    return {
      id: row.id,
      receiptNumber: row.receiptNumber,
      receiptType: row.receiptType,
      status: row.status,
      statusLabel: receiptStatusLabel(row.status),
      purchaseOrderId: row.purchaseOrderId,
      poNumber: po.poNumber,
      purchaseOrderVersionId: row.purchaseOrderVersionId,
      supplierName: supplier?.party.displayName ?? "Supplier",
      receiptDate: row.receiptDate,
      deliveryLocation: row.deliveryLocation,
      inspectionStatus: row.inspectionStatus,
      inspectionNotes: row.inspectionNotes,
      servicePeriodStart: row.servicePeriodStart,
      servicePeriodEnd: row.servicePeriodEnd,
      assetCondition: row.assetCondition,
      comments: row.comments,
      evidenceDocumentId: row.evidenceDocumentId,
      overDeliveryFlag: row.overDeliveryFlag,
      lines: lines.map((line) => {
        const handoff = handoffs.find((item) => item.receiptLineId === line.id) ?? null;
        return {
          id: line.id,
          poLineId: line.poLineId,
          lineType: line.lineType,
          description: line.description,
          quantityReceived: line.quantityReceived,
          uom: line.uom,
          discrepancyType: line.discrepancyType,
          discrepancyDescription: line.discrepancyDescription,
          damageFlag: line.damageFlag,
          handoff: handoff
            ? {
                id: handoff.id,
                handoffType: handoff.handoffType,
                status: handoff.status,
                downstreamSystem: handoff.downstreamSystem,
                downstreamReference: handoff.downstreamReference,
                errorMessage: handoff.errorMessage,
              }
            : null,
        };
      }),
      canSubmit: row.status === RECEIPT_STATUSES.DRAFT,
      canConfirm:
        row.status === RECEIPT_STATUSES.DRAFT || row.status === RECEIPT_STATUSES.SUBMITTED,
      canReject:
        row.status === RECEIPT_STATUSES.DRAFT || row.status === RECEIPT_STATUSES.SUBMITTED,
      canRecordInspection: row.status === RECEIPT_STATUSES.CONFIRMED,
    };
  }

  private async allocateReceiptNumber(businessId: string, receiptType: string) {
    try {
      return await this.deps.numbering.allocate({
        businessId,
        documentType: documentTypeForReceipt(receiptType),
      });
    } catch (error) {
      if (error instanceof DocumentNumberingError) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.NUMBERING_POLICY_MISSING, undefined, 409);
      }
      throw error;
    }
  }

  private async recordReceiptPerformance(
    context: CurrentBusinessContext,
    receipt: { id: string; profileId: string },
    input: { sourceKey: string; measureCode: string; sourceId: string }
  ) {
    if (!this.deps.performance) {
      return;
    }
    await this.deps.performance.recordEvent({
      businessId: context.businessId,
      profileId: receipt.profileId,
      measureCode: input.measureCode,
      sourceType: PERFORMANCE_SOURCE_TYPES.RECEIPT,
      sourceId: input.sourceId,
      sourceKey: input.sourceKey,
      actorUserId: actorId(context),
    });
  }

  private async raiseReceiptException(
    context: CurrentBusinessContext,
    receipt: { id: string; profileId: string; purchaseOrderId: string },
    input: {
      sourceKey: string;
      exceptionTypeCode: string;
      title: string;
      description: string | null;
    }
  ) {
    if (!this.deps.exceptions) {
      return;
    }
    await this.deps.exceptions.raiseSystem({
      businessId: context.businessId,
      sourceKey: input.sourceKey,
      exceptionTypeCode: input.exceptionTypeCode,
      title: input.title,
      description: input.description,
      raisedFrom: EXCEPTION_RAISED_FROM.SYSTEM_RECEIPT,
      profileId: receipt.profileId,
      actorUserId: actorId(context),
      links: [
        { objectType: EXCEPTION_OBJECT_TYPES.RECEIPT, objectId: receipt.id },
        { objectType: EXCEPTION_OBJECT_TYPES.PURCHASE_ORDER, objectId: receipt.purchaseOrderId },
        { objectType: EXCEPTION_OBJECT_TYPES.PROFILE, objectId: receipt.profileId },
      ],
    });
  }

  private async audit(
    context: CurrentBusinessContext,
    entityId: string,
    action: string,
    references?: Record<string, string>
  ) {
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityId,
      action,
      outcome: "SUCCESS",
      references,
    });
  }
}

export function createDefaultReceivingDependencies(): ReceivingServiceDependencies {
  return {
    store: createReceivingRepository(),
    poStore: createPurchaseOrderRepository(),
    controls: createReceivingControlRepository(),
    numbering: new ConfigurableDocumentNumberingService(createDocumentNumberingPolicyRepository()),
    audit: createProcurementAuditAdapter(),
    suggestedSupplier: createSuggestedSupplierAdapter(),
    inventoryHandoff: createInProcessInventoryHandoffAdapter(),
    assetHandoff: createInProcessAssetHandoffAdapter(),
    exceptions: createProcurementExceptionBridge(),
    performance: createProcurementPerformanceBridge(),
  };
}

export function createReceivingService(
  overrides: Partial<ReceivingServiceDependencies> = {}
): ReceivingService {
  return new ReceivingService({ ...createDefaultReceivingDependencies(), ...overrides });
}
