/**
 * Purpose:
 * Controlled stock receiving and opening-balance documents that post
 * through the IP-01 inventory ledger.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { applyInboundQuantity, multiplyInventoryAmount } from "@/core/inventory-engine";
import {
  DOCUMENT_NUMBERING_DOCUMENT_TYPES,
  type DocumentNumberingPort,
} from "@/core/localization-regulatory/document-numbering";
import {
  WORKFLOW_ENGINE_ERROR_CODES,
  WorkflowEngineError,
  type WorkflowEnginePort,
} from "@/core/workflow-engine";
import {
  INVENTORY_AUDIT_ACTIONS,
  INVENTORY_DOCUMENT_STATUSES,
  INVENTORY_IDEMPOTENCY_OPERATIONS,
  INVENTORY_OPERATION_CODES,
  INVENTORY_OPS_INCIDENT_TYPES,
  STOCK_ITEM_TYPE_CODES,
} from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryAuditPort,
  InventoryBalanceRepositoryPort,
  InventoryIdempotencyPort,
  InventoryLocationRepositoryPort,
  InventoryLockPort,
  InventoryMovementRepositoryPort,
  InventoryOpeningBalanceLineRepositoryPort,
  InventoryOpeningBalanceRepositoryPort,
  InventoryOperationControlPort,
  InventoryOpsIncidentPort,
  InventoryReceiptLineRepositoryPort,
  InventoryReceiptRepositoryPort,
  InventorySupplierPort,
  InventoryTraceabilityPort,
  InventoryUnitCataloguePort,
  StockItemLocationRepositoryPort,
  StockItemRepositoryPort,
} from "@/modules/inventory/ports";
import { createInventoryControlWorkflowAdapter } from "@/modules/inventory/adapters/inventory-control-workflow-adapter";
import { createInventorySupplierAdapter } from "@/modules/inventory/adapters/inventory-supplier-adapter";
import { createInventoryIdempotencyRepository } from "@/modules/inventory/repositories/inventory-idempotency-repository";
import { createInventoryOperationControlRepository } from "@/modules/inventory/repositories/inventory-operation-control-repository";
import {
  createInventoryOpeningBalanceLineRepository,
  createInventoryOpeningBalanceRepository,
} from "@/modules/inventory/repositories/inventory-opening-balance-repository";
import {
  createInventoryReceiptLineRepository,
  createInventoryReceiptRepository,
} from "@/modules/inventory/repositories/inventory-receipt-repository";
import { createInventoryBalanceRepository } from "@/modules/inventory/repositories/inventory-balance-repository";
import { createInventoryLocationRepository } from "@/modules/inventory/repositories/inventory-location-repository";
import { createInventoryMovementRepository } from "@/modules/inventory/repositories/inventory-movement-repository";
import { createStockItemLocationRepository } from "@/modules/inventory/repositories/stock-item-location-repository";
import { createStockItemRepository } from "@/modules/inventory/repositories/stock-item-repository";
import { createUnitOfMeasureAdapter } from "@/modules/inventory/adapters/unit-of-measure-adapter";
import { createInventoryAuditAdapter } from "@/modules/inventory/services/inventory-audit-helper";
import { postInboundLineToLedger } from "@/modules/inventory/services/inventory-inbound-posting";
import {
  assertCanCancel,
  assertCanPost,
  assertDraftEditable,
  assertInboundValuation,
  assertOverReceiptAllowed,
  assertPositiveInboundQuantity,
  inboundExpectedScopeKey,
  parseOptionalDate,
  receivingUomId,
  remainingQuantity,
  resolveInboundBaseQuantity,
} from "@/modules/inventory/services/inventory-inbound-rules";
import { ConfigurableDocumentNumberingService } from "@/core/localization-regulatory/services/document-numbering-service";
import { createDocumentNumberingPolicyRepository } from "@/core/localization-regulatory/repositories/document-numbering-policy-repository";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import { recordDetectedOpsIncident } from "@/modules/inventory/services/inventory-ops-incident-hook";
import { createInventoryOpsIncidentService } from "@/modules/inventory/services/inventory-ops-incident-service";
import { normalizeOptionalText } from "@/modules/inventory/services/stock-item-rules";
import {
  captureFromCommand,
  createDefaultTraceabilityDependencies,
  createTraceabilityService,
  requireModePort,
} from "@/modules/inventory/services/inventory-traceability-service";
import { trackingModeOf } from "@/modules/inventory/services/inventory-traceability-rules";
import type {
  AddOpeningBalanceLineCommand,
  AddReceiptLineCommand,
  CreateOpeningBalanceCommand,
  CreateReceiptCommand,
  InventoryInboundLineRecord,
  InventoryInboundLineView,
  InventoryOpeningBalanceView,
  InventoryReceiptView,
  InventorySupplierRef,
  StockItemRecord,
} from "@/modules/inventory/types";

export type StockReceivingServiceDependencies = {
  stockItems: StockItemRepositoryPort;
  locations: InventoryLocationRepositoryPort;
  itemLocations: StockItemLocationRepositoryPort;
  movements: InventoryMovementRepositoryPort;
  balances: InventoryBalanceRepositoryPort;
  receipts: InventoryReceiptRepositoryPort;
  receiptLines: InventoryReceiptLineRepositoryPort;
  openings: InventoryOpeningBalanceRepositoryPort;
  openingLines: InventoryOpeningBalanceLineRepositoryPort;
  controls: InventoryOperationControlPort;
  suppliers: InventorySupplierPort;
  units: InventoryUnitCataloguePort;
  numbering: DocumentNumberingPort;
  workflow: WorkflowEnginePort;
  idempotency: InventoryIdempotencyPort;
  locks: InventoryLockPort;
  audit: InventoryAuditPort;
  traceability?: InventoryTraceabilityPort | null;
  opsIncidents?: InventoryOpsIncidentPort;
};

function actorId(context: CurrentBusinessContext): string | null {
  return context.platformUserId || null;
}

export class StockReceivingService {
  constructor(private readonly deps: StockReceivingServiceDependencies) {}

  async createReceipt(context: CurrentBusinessContext, command: CreateReceiptCommand) {
    const businessId = context.businessId;
    const location = await this.requireActiveLocation(businessId, command.locationId);
    const supplier = await this.requireOptionalSupplier(businessId, command.supplierPartyId);
    const allocated = await this.deps.numbering.allocate({
      businessId,
      documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.STOCK_RECEIPT,
    });
    const header = await this.deps.receipts.insert({
      businessId,
      documentNumber: allocated.number,
      status: INVENTORY_DOCUMENT_STATUSES.DRAFT,
      locationId: location.id,
      supplierPartyId: supplier?.id ?? null,
      supplierReference: normalizeOptionalText(command.supplierReference),
      deliveryNumber: normalizeOptionalText(command.deliveryNumber),
      receiptDate: parseOptionalDate(command.receiptDate),
      notes: normalizeOptionalText(command.notes),
      submittedAt: null,
      submittedBy: null,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
      postedAt: null,
      postedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      metadata: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.RECEIPT_CREATED, {
      documentNumber: header.documentNumber,
      locationId: location.id,
    });
    return this.toReceiptView(businessId, header.id);
  }

  async addReceiptLine(
    context: CurrentBusinessContext,
    receiptId: string,
    command: AddReceiptLineCommand
  ) {
    const businessId = context.businessId;
    const header = await this.requireReceipt(businessId, receiptId);
    assertDraftEditable(header.status);
    const quantity = assertPositiveInboundQuantity(command.quantity);
    const expected = command.expectedQuantity
      ? assertPositiveInboundQuantity(command.expectedQuantity, "expectedQuantity")
      : null;
    const control = await this.requireControl(businessId, INVENTORY_OPERATION_CODES.STOCK_RECEIVING);
    const valuation = assertInboundValuation({
      quantity,
      unitCost: command.unitCost,
      lineTotal: command.lineTotal,
      currencyCode: command.currencyCode,
    });
    const stockItem = await this.requireInboundStockItem(businessId, command.stockItemId, header.locationId);
    const uomId = receivingUomId(stockItem, command.uomId);
    await this.requireUnit(businessId, uomId);
    const converted = resolveInboundBaseQuantity({
      enteredQuantity: quantity,
      enteredUomId: uomId,
      stockItem,
    });
    const expectedBase = expected
      ? resolveInboundBaseQuantity({
          enteredQuantity: expected,
          enteredUomId: uomId,
          stockItem,
        }).baseQuantity
      : null;
    const alreadyPosted = await this.postedReceivedBase({
      businessId,
      locationId: header.locationId,
      stockItemId: stockItem.id,
      scopeKey: inboundExpectedScopeKey(header),
    });
    try {
      assertOverReceiptAllowed({
        received: applyInboundQuantity(alreadyPosted, converted.baseQuantity),
        expected: expectedBase,
        policy: control.overReceiptPolicy,
      });
    } catch (error) {
      if (
        error instanceof InventoryError &&
        error.code === INVENTORY_ERROR_CODES.OVER_RECEIPT_NOT_ALLOWED
      ) {
        await recordDetectedOpsIncident(this.deps.opsIncidents, context, {
          incidentType: INVENTORY_OPS_INCIDENT_TYPES.RECEIVING_MISMATCH,
          severity: "HIGH",
          sourceType: "RECEIPT",
          sourceId: header.id,
          stockItemId: stockItem.id,
          locationId: header.locationId,
          description: "Received quantity cannot exceed the expected quantity for this delivery.",
          idempotencyKey: `receiving-mismatch:${header.id}:${stockItem.id}`,
        });
      }
      throw error;
    }
    const existing = await this.deps.receiptLines.listByHeader(businessId, header.id);
    const line = await this.deps.receiptLines.insert({
      businessId,
      headerId: header.id,
      lineNumber: existing.length + 1,
      stockItemId: stockItem.id,
      quantity: converted.enteredQuantity,
      expectedQuantity: expected,
      uomId: converted.enteredUomId,
      baseQuantity: converted.baseQuantity,
      conversionFactor: converted.conversionFactor,
      unitCost: valuation.unitCost,
      lineTotal: valuation.lineTotal,
      currencyCode: valuation.currencyCode,
      notes: normalizeOptionalText(command.notes),
      movementId: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.captureInboundTrace(context, {
      sourceType: "STOCK_RECEIPT",
      sourceId: header.id,
      sourceLineId: line.id,
      stockItem,
      capture: captureFromCommand(command),
      baseQuantity: converted.baseQuantity,
    });
    return this.toReceiptView(businessId, header.id);
  }

  async submitReceipt(context: CurrentBusinessContext, receiptId: string) {
    const businessId = context.businessId;
    const header = await this.requireReceipt(businessId, receiptId);
    assertDraftEditable(header.status);
    const lines = await this.deps.receiptLines.listByHeader(businessId, header.id);
    if (lines.length === 0) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LINE_REQUIRED);
    }
    await this.deps.receipts.update(businessId, header.id, {
      status: INVENTORY_DOCUMENT_STATUSES.SUBMITTED,
      submittedAt: new Date(),
      submittedBy: actorId(context),
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.RECEIPT_SUBMITTED, {
      documentNumber: header.documentNumber,
    });
    return this.toReceiptView(businessId, header.id);
  }

  async approveReceipt(context: CurrentBusinessContext, receiptId: string) {
    const businessId = context.businessId;
    const header = await this.requireReceipt(businessId, receiptId);
    if (header.status !== INVENTORY_DOCUMENT_STATUSES.SUBMITTED) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_POSTABLE);
    }
    this.assertChecker(header.submittedBy, actorId(context));
    await this.deps.receipts.update(businessId, header.id, {
      status: INVENTORY_DOCUMENT_STATUSES.APPROVED,
      approvedAt: new Date(),
      approvedBy: actorId(context),
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.RECEIPT_APPROVED, {
      documentNumber: header.documentNumber,
    });
    return this.toReceiptView(businessId, header.id);
  }

  async rejectReceipt(context: CurrentBusinessContext, receiptId: string, reason: string) {
    const businessId = context.businessId;
    const header = await this.requireReceipt(businessId, receiptId);
    if (header.status !== INVENTORY_DOCUMENT_STATUSES.SUBMITTED) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_POSTABLE);
    }
    const rejectionReason = normalizeOptionalText(reason);
    if (!rejectionReason) {
      throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "reason",
      });
    }
    this.assertChecker(header.submittedBy, actorId(context));
    await this.deps.receipts.update(businessId, header.id, {
      status: INVENTORY_DOCUMENT_STATUSES.REJECTED,
      rejectedAt: new Date(),
      rejectedBy: actorId(context),
      rejectionReason,
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.RECEIPT_REJECTED, {
      documentNumber: header.documentNumber,
      reason: rejectionReason,
    }, rejectionReason);
    return this.toReceiptView(businessId, header.id);
  }

  async cancelReceipt(context: CurrentBusinessContext, receiptId: string) {
    const businessId = context.businessId;
    const header = await this.requireReceipt(businessId, receiptId);
    assertCanCancel(header.status);
    await this.deps.receipts.update(businessId, header.id, {
      status: INVENTORY_DOCUMENT_STATUSES.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: actorId(context),
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.RECEIPT_CANCELLED, {
      documentNumber: header.documentNumber,
    });
    return this.toReceiptView(businessId, header.id);
  }

  async postReceipt(context: CurrentBusinessContext, receiptId: string) {
    const businessId = context.businessId;
    return this.deps.locks.runExclusive(`${businessId}:inbound:receipt:${receiptId}`, async () => {
      const header = await this.requireReceipt(businessId, receiptId);
      if (header.status === INVENTORY_DOCUMENT_STATUSES.POSTED) {
        return this.toReceiptView(businessId, header.id);
      }
      const control = await this.requireControl(businessId, INVENTORY_OPERATION_CODES.STOCK_RECEIVING);
      const decision = await this.deps.workflow.evaluateOperationApproval({
        businessId,
        operationCode: control.code,
      });
      assertCanPost(header.status, decision.required);
      const lines = await this.deps.receiptLines.listByHeader(businessId, header.id);
      if (lines.length === 0) {
        throw new InventoryError(INVENTORY_ERROR_CODES.LINE_REQUIRED);
      }
      const location = await this.requireActiveLocation(businessId, header.locationId);
      const idempotencyKey = `${INVENTORY_IDEMPOTENCY_OPERATIONS.POST_RECEIPT}:${header.id}`;
      const existingKey = await this.deps.idempotency.find(
        businessId,
        INVENTORY_IDEMPOTENCY_OPERATIONS.POST_RECEIPT,
        idempotencyKey
      );
      if (existingKey) {
        return this.toReceiptView(businessId, header.id);
      }
      await this.postLines({
        context,
        movementType: control.movementType,
        sourceType: "STOCK_RECEIPT",
        sourceId: header.id,
        location,
        lines,
        occurredAt: header.receiptDate,
        reason: header.notes,
        lineRepo: this.deps.receiptLines,
        overReceiptPolicy: control.overReceiptPolicy,
        scopeKey: inboundExpectedScopeKey(header),
      });
      await this.deps.idempotency.insert({
        businessId,
        idempotencyKey,
        operationType: INVENTORY_IDEMPOTENCY_OPERATIONS.POST_RECEIPT,
        resourceType: "inventory_receipt",
        resourceId: header.id,
        createdBy: actorId(context),
      });
      await this.deps.receipts.update(businessId, header.id, {
        status: INVENTORY_DOCUMENT_STATUSES.POSTED,
        postedAt: new Date(),
        postedBy: actorId(context),
        updatedBy: actorId(context),
        version: header.version + 1,
      });
      await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.RECEIPT_POSTED, {
        documentNumber: header.documentNumber,
        locationId: location.id,
        lineCount: lines.length,
        movementType: control.movementType,
      });
      return this.toReceiptView(businessId, header.id);
    });
  }

  async getReceipt(context: CurrentBusinessContext, receiptId: string) {
    return this.toReceiptView(context.businessId, receiptId);
  }

  async listReceipts(context: CurrentBusinessContext) {
    const rows = await this.deps.receipts.listByBusiness(context.businessId);
    const views: InventoryReceiptView[] = [];
    for (const row of rows) {
      views.push(await this.toReceiptView(context.businessId, row.id));
    }
    return views;
  }

  async createOpeningBalance(context: CurrentBusinessContext, command: CreateOpeningBalanceCommand) {
    const businessId = context.businessId;
    const location = await this.requireActiveLocation(businessId, command.locationId);
    const allocated = await this.deps.numbering.allocate({
      businessId,
      documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.OPENING_BALANCE,
    });
    const header = await this.deps.openings.insert({
      businessId,
      documentNumber: allocated.number,
      status: INVENTORY_DOCUMENT_STATUSES.DRAFT,
      locationId: location.id,
      openingDate: parseOptionalDate(command.openingDate),
      notes: normalizeOptionalText(command.notes),
      submittedAt: null,
      submittedBy: null,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
      postedAt: null,
      postedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      metadata: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.OPENING_BALANCE_CREATED, {
      documentNumber: header.documentNumber,
      locationId: location.id,
    });
    return this.toOpeningView(businessId, header.id);
  }

  async addOpeningBalanceLine(
    context: CurrentBusinessContext,
    openingId: string,
    command: AddOpeningBalanceLineCommand
  ) {
    const businessId = context.businessId;
    const header = await this.requireOpening(businessId, openingId);
    assertDraftEditable(header.status);
    const quantity = assertPositiveInboundQuantity(command.quantity);
    const valuation = assertInboundValuation({
      quantity,
      unitCost: command.unitCost,
      lineTotal: command.lineTotal,
      currencyCode: command.currencyCode,
    });
    const stockItem = await this.requireInboundStockItem(businessId, command.stockItemId, header.locationId);
    const uomId = receivingUomId(stockItem, command.uomId);
    await this.requireUnit(businessId, uomId);
    const converted = resolveInboundBaseQuantity({
      enteredQuantity: quantity,
      enteredUomId: uomId,
      stockItem,
    });
    const existing = await this.deps.openingLines.listByHeader(businessId, header.id);
    const line = await this.deps.openingLines.insert({
      businessId,
      headerId: header.id,
      lineNumber: existing.length + 1,
      stockItemId: stockItem.id,
      quantity: converted.enteredQuantity,
      expectedQuantity: null,
      uomId: converted.enteredUomId,
      baseQuantity: converted.baseQuantity,
      conversionFactor: converted.conversionFactor,
      unitCost: valuation.unitCost,
      lineTotal: valuation.lineTotal,
      currencyCode: valuation.currencyCode,
      notes: normalizeOptionalText(command.notes),
      movementId: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.captureInboundTrace(context, {
      sourceType: "OPENING_BALANCE",
      sourceId: header.id,
      sourceLineId: line.id,
      stockItem,
      capture: captureFromCommand(command),
      baseQuantity: converted.baseQuantity,
    });
    return this.toOpeningView(businessId, header.id);
  }

  async submitOpeningBalance(context: CurrentBusinessContext, openingId: string) {
    const businessId = context.businessId;
    const header = await this.requireOpening(businessId, openingId);
    assertDraftEditable(header.status);
    const lines = await this.deps.openingLines.listByHeader(businessId, header.id);
    if (lines.length === 0) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LINE_REQUIRED);
    }
    await this.deps.openings.update(businessId, header.id, {
      status: INVENTORY_DOCUMENT_STATUSES.SUBMITTED,
      submittedAt: new Date(),
      submittedBy: actorId(context),
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.OPENING_BALANCE_SUBMITTED, {
      documentNumber: header.documentNumber,
    });
    return this.toOpeningView(businessId, header.id);
  }

  async approveOpeningBalance(context: CurrentBusinessContext, openingId: string) {
    const businessId = context.businessId;
    const header = await this.requireOpening(businessId, openingId);
    if (header.status !== INVENTORY_DOCUMENT_STATUSES.SUBMITTED) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_POSTABLE);
    }
    this.assertChecker(header.submittedBy, actorId(context));
    await this.deps.openings.update(businessId, header.id, {
      status: INVENTORY_DOCUMENT_STATUSES.APPROVED,
      approvedAt: new Date(),
      approvedBy: actorId(context),
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.OPENING_BALANCE_APPROVED, {
      documentNumber: header.documentNumber,
    });
    return this.toOpeningView(businessId, header.id);
  }

  async rejectOpeningBalance(context: CurrentBusinessContext, openingId: string, reason: string) {
    const businessId = context.businessId;
    const header = await this.requireOpening(businessId, openingId);
    if (header.status !== INVENTORY_DOCUMENT_STATUSES.SUBMITTED) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_POSTABLE);
    }
    const rejectionReason = normalizeOptionalText(reason);
    if (!rejectionReason) {
      throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "reason",
      });
    }
    this.assertChecker(header.submittedBy, actorId(context));
    await this.deps.openings.update(businessId, header.id, {
      status: INVENTORY_DOCUMENT_STATUSES.REJECTED,
      rejectedAt: new Date(),
      rejectedBy: actorId(context),
      rejectionReason,
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.OPENING_BALANCE_REJECTED, {
      documentNumber: header.documentNumber,
      reason: rejectionReason,
    }, rejectionReason);
    return this.toOpeningView(businessId, header.id);
  }

  async cancelOpeningBalance(context: CurrentBusinessContext, openingId: string) {
    const businessId = context.businessId;
    const header = await this.requireOpening(businessId, openingId);
    assertCanCancel(header.status);
    await this.deps.openings.update(businessId, header.id, {
      status: INVENTORY_DOCUMENT_STATUSES.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: actorId(context),
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.OPENING_BALANCE_CANCELLED, {
      documentNumber: header.documentNumber,
    });
    return this.toOpeningView(businessId, header.id);
  }

  async postOpeningBalance(context: CurrentBusinessContext, openingId: string) {
    const businessId = context.businessId;
    return this.deps.locks.runExclusive(`${businessId}:inbound:opening:${openingId}`, async () => {
      const header = await this.requireOpening(businessId, openingId);
      if (header.status === INVENTORY_DOCUMENT_STATUSES.POSTED) {
        return this.toOpeningView(businessId, header.id);
      }
      const control = await this.requireControl(businessId, INVENTORY_OPERATION_CODES.OPENING_BALANCE);
      const decision = await this.deps.workflow.evaluateOperationApproval({
        businessId,
        operationCode: control.code,
      });
      assertCanPost(header.status, decision.required);
      const lines = await this.deps.openingLines.listByHeader(businessId, header.id);
      if (lines.length === 0) {
        throw new InventoryError(INVENTORY_ERROR_CODES.LINE_REQUIRED);
      }
      const location = await this.requireActiveLocation(businessId, header.locationId);
      const idempotencyKey = `${INVENTORY_IDEMPOTENCY_OPERATIONS.POST_OPENING}:${header.id}`;
      const existingKey = await this.deps.idempotency.find(
        businessId,
        INVENTORY_IDEMPOTENCY_OPERATIONS.POST_OPENING,
        idempotencyKey
      );
      if (existingKey) {
        return this.toOpeningView(businessId, header.id);
      }
      await this.postLines({
        context,
        movementType: control.movementType,
        sourceType: "OPENING_BALANCE",
        sourceId: header.id,
        location,
        lines,
        occurredAt: header.openingDate,
        reason: header.notes,
        lineRepo: this.deps.openingLines,
        overReceiptPolicy: control.overReceiptPolicy,
        scopeKey: header.id,
      });
      await this.deps.idempotency.insert({
        businessId,
        idempotencyKey,
        operationType: INVENTORY_IDEMPOTENCY_OPERATIONS.POST_OPENING,
        resourceType: "inventory_opening_balance",
        resourceId: header.id,
        createdBy: actorId(context),
      });
      await this.deps.openings.update(businessId, header.id, {
        status: INVENTORY_DOCUMENT_STATUSES.POSTED,
        postedAt: new Date(),
        postedBy: actorId(context),
        updatedBy: actorId(context),
        version: header.version + 1,
      });
      await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.OPENING_BALANCE_POSTED, {
        documentNumber: header.documentNumber,
        locationId: location.id,
        lineCount: lines.length,
        movementType: control.movementType,
      });
      return this.toOpeningView(businessId, header.id);
    });
  }

  async getOpeningBalance(context: CurrentBusinessContext, openingId: string) {
    return this.toOpeningView(context.businessId, openingId);
  }

  async listOpeningBalances(context: CurrentBusinessContext) {
    const rows = await this.deps.openings.listByBusiness(context.businessId);
    const views: InventoryOpeningBalanceView[] = [];
    for (const row of rows) {
      views.push(await this.toOpeningView(context.businessId, row.id));
    }
    return views;
  }

  async listSuppliers(context: CurrentBusinessContext) {
    return this.deps.suppliers.listActiveSuppliers(context.businessId);
  }

  private async postLines(args: {
    context: CurrentBusinessContext;
    movementType: string;
    sourceType: string;
    sourceId: string;
    location: Awaited<ReturnType<StockReceivingService["requireActiveLocation"]>>;
    lines: InventoryInboundLineRecord[];
    occurredAt: Date;
    reason: string | null;
    lineRepo: InventoryReceiptLineRepositoryPort | InventoryOpeningBalanceLineRepositoryPort;
    overReceiptPolicy: string;
    scopeKey: string;
  }) {
    const businessId = args.context.businessId;
    const postedInBatch = new Map<string, string>();
    for (const line of args.lines) {
      const stockItem = await this.requireInboundStockItem(
        businessId,
        line.stockItemId,
        args.location.id
      );
      const converted = resolveInboundBaseQuantity({
        enteredQuantity: line.quantity,
        enteredUomId: line.uomId,
        stockItem,
      });
      const expectedBase = line.expectedQuantity
        ? resolveInboundBaseQuantity({
            enteredQuantity: line.expectedQuantity,
            enteredUomId: line.uomId,
            stockItem,
          }).baseQuantity
        : null;
      const alreadyPosted = applyInboundQuantity(
        await this.postedReceivedBase({
          businessId,
          locationId: args.location.id,
          stockItemId: stockItem.id,
          scopeKey: args.scopeKey,
        }),
        postedInBatch.get(stockItem.id) ?? "0"
      );
      try {
        assertOverReceiptAllowed({
          received: applyInboundQuantity(alreadyPosted, converted.baseQuantity),
          expected: expectedBase,
          policy: args.overReceiptPolicy,
        });
      } catch (error) {
        if (
          error instanceof InventoryError &&
          error.code === INVENTORY_ERROR_CODES.OVER_RECEIPT_NOT_ALLOWED
        ) {
          await recordDetectedOpsIncident(this.deps.opsIncidents, args.context, {
            incidentType: INVENTORY_OPS_INCIDENT_TYPES.RECEIVING_MISMATCH,
            severity: "HIGH",
            sourceType: args.sourceType,
            sourceId: args.sourceId,
            stockItemId: stockItem.id,
            locationId: args.location.id,
            description: "Received quantity cannot exceed the expected quantity for this delivery.",
            idempotencyKey: `receiving-mismatch:${args.sourceId}:${stockItem.id}`,
          });
        }
        throw error;
      }
      const movement = await postInboundLineToLedger({
        businessId,
        actorId: actorId(args.context),
        movementType: args.movementType,
        stockItem,
        location: args.location,
        line,
        ledgerQuantity: converted.baseQuantity,
        ledgerUomId: converted.baseUomId,
        conversionFactor: converted.conversionFactor,
        sourceType: args.sourceType,
        sourceId: args.sourceId,
        occurredAt: args.occurredAt,
        reason: args.reason,
        movements: this.deps.movements,
        balances: this.deps.balances,
      });
      requireModePort(trackingModeOf(stockItem), this.deps.traceability);
      await this.deps.traceability?.applyInbound({
        context: args.context,
        stockItem,
        locationId: args.location.id,
        movementId: movement.id,
        sourceType: args.sourceType,
        sourceId: args.sourceId,
        sourceLineId: line.id,
        baseQuantity: converted.baseQuantity,
      });
      await args.lineRepo.update(businessId, line.id, {
        baseQuantity: converted.baseQuantity,
        conversionFactor: converted.conversionFactor,
        movementId: movement.id,
        updatedBy: actorId(args.context),
      });
      postedInBatch.set(
        stockItem.id,
        applyInboundQuantity(postedInBatch.get(stockItem.id) ?? "0", converted.baseQuantity)
      );
    }
  }

  private async captureInboundTrace(
    context: CurrentBusinessContext,
    input: {
      sourceType: string;
      sourceId: string;
      sourceLineId: string;
      stockItem: StockItemRecord;
      capture: ReturnType<typeof captureFromCommand>;
      baseQuantity: string;
    }
  ) {
    requireModePort(trackingModeOf(input.stockItem), this.deps.traceability);
    await this.deps.traceability?.captureLine(context, {
      ...input,
      direction: "IN",
    });
  }

  private assertChecker(submittedBy: string | null, checkerId: string | null) {
    try {
      this.deps.workflow.assertDistinctActors(
        submittedBy ?? "",
        checkerId ?? "",
        "The person who submitted this document cannot approve it."
      );
    } catch (error) {
      if (
        error instanceof WorkflowEngineError &&
        error.code === WORKFLOW_ENGINE_ERROR_CODES.SELF_APPROVAL
      ) {
        throw new InventoryError(INVENTORY_ERROR_CODES.SELF_APPROVAL, error.message, 409);
      }
      throw error;
    }
  }

  private async requireControl(businessId: string, operationCode: string) {
    const control = await this.deps.controls.getControl(businessId, operationCode);
    if (!control) {
      throw new InventoryError(INVENTORY_ERROR_CODES.OPERATION_CONTROL_MISSING, undefined, 409);
    }
    return control;
  }

  private async requireReceipt(businessId: string, receiptId: string) {
    const row = await this.deps.receipts.findById(businessId, receiptId);
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
    }
    return row;
  }

  private async requireOpening(businessId: string, openingId: string) {
    const row = await this.deps.openings.findById(businessId, openingId);
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
    }
    return row;
  }

  private async requireActiveLocation(businessId: string, locationId: string) {
    const row = await this.deps.locations.findById(businessId, locationId);
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LOCATION_NOT_FOUND, undefined, 404);
    }
    if (!row.isActive) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LOCATION_INACTIVE);
    }
    return row;
  }

  private async requireInboundStockItem(businessId: string, stockItemId: string, locationId: string) {
    const stockItem = await this.deps.stockItems.findById(businessId, stockItemId);
    if (!stockItem) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCK_ITEM_NOT_FOUND, undefined, 404);
    }
    if (!stockItem.isActive || !stockItem.stockTrackingEnabled) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCK_TRACKING_REQUIRED);
    }
    if (stockItem.itemTypeCode !== STOCK_ITEM_TYPE_CODES.STOCKED_ITEM) {
      throw new InventoryError(INVENTORY_ERROR_CODES.NON_STOCK_CANNOT_CREATE_BALANCE);
    }
    const config = await this.deps.itemLocations.findByItemAndLocation(
      businessId,
      stockItem.id,
      locationId
    );
    if (!config || !config.isActive) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCK_ITEM_NOT_AT_LOCATION);
    }
    return stockItem;
  }

  private async requireUnit(businessId: string, uomId: string) {
    const unit = await this.deps.units.findById(businessId, uomId);
    if (!unit || unit.status === "ARCHIVED") {
      throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_UOM, undefined, 400, { field: "uomId" });
    }
    return unit;
  }

  private async requireOptionalSupplier(
    businessId: string,
    partyId: string | null | undefined
  ): Promise<InventorySupplierRef | null> {
    const id = partyId?.trim();
    if (!id) {
      return null;
    }
    const supplier = await this.deps.suppliers.findActiveSupplier(businessId, id);
    if (!supplier) {
      throw new InventoryError(INVENTORY_ERROR_CODES.SUPPLIER_NOT_FOUND, undefined, 404);
    }
    return supplier;
  }

  private async audit(
    context: CurrentBusinessContext,
    entityId: string,
    action: string,
    references: Record<string, unknown>,
    reason?: string | null
  ) {
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityName: action.startsWith("OPENING_BALANCE")
        ? "inventory_opening_balance"
        : "inventory_receipt",
      entityId,
      action,
      outcome: "SUCCESS",
      reason,
      references,
    });
  }

  private async toReceiptView(businessId: string, receiptId: string): Promise<InventoryReceiptView> {
    const header = await this.requireReceipt(businessId, receiptId);
    const location = await this.deps.locations.findById(businessId, header.locationId);
    const supplier = header.supplierPartyId
      ? await this.deps.suppliers.findActiveSupplier(businessId, header.supplierPartyId)
      : null;
    const lines = await this.toLineViews({
      businessId,
      locationId: header.locationId,
      lines: await this.deps.receiptLines.listByHeader(businessId, header.id),
      includeExpected: true,
      scopeKey: inboundExpectedScopeKey(header),
    });
    return {
      id: header.id,
      documentNumber: header.documentNumber,
      status: header.status,
      locationId: header.locationId,
      locationName: location?.name ?? "",
      supplierPartyId: header.supplierPartyId,
      supplierName: supplier?.displayName ?? null,
      supplierReference: header.supplierReference,
      deliveryNumber: header.deliveryNumber,
      receiptDate: header.receiptDate.toISOString(),
      notes: header.notes,
      lineCount: lines.length,
      totalQuantity: sumQuantities(lines.map((row) => row.quantity)),
      totalValue: sumValues(lines.map((row) => row.lineTotal)),
      lines,
      submittedBy: header.submittedBy,
      approvedBy: header.approvedBy,
      postedAt: header.postedAt?.toISOString() ?? null,
    };
  }

  private async toOpeningView(
    businessId: string,
    openingId: string
  ): Promise<InventoryOpeningBalanceView> {
    const header = await this.requireOpening(businessId, openingId);
    const location = await this.deps.locations.findById(businessId, header.locationId);
    const lines = await this.toLineViews({
      businessId,
      locationId: header.locationId,
      lines: await this.deps.openingLines.listByHeader(businessId, header.id),
      includeExpected: false,
      scopeKey: header.id,
    });
    return {
      id: header.id,
      documentNumber: header.documentNumber,
      status: header.status,
      locationId: header.locationId,
      locationName: location?.name ?? "",
      openingDate: header.openingDate.toISOString(),
      notes: header.notes,
      lineCount: lines.length,
      totalQuantity: sumQuantities(lines.map((row) => row.quantity)),
      totalValue: sumValues(lines.map((row) => row.lineTotal)),
      lines,
      submittedBy: header.submittedBy,
      approvedBy: header.approvedBy,
      postedAt: header.postedAt?.toISOString() ?? null,
    };
  }

  private async postedReceivedBase(params: {
    businessId: string;
    locationId: string;
    stockItemId: string;
    scopeKey: string;
  }): Promise<string> {
    const receipts = await this.deps.receipts.listByBusiness(params.businessId);
    let total = "0";
    for (const receipt of receipts) {
      if (receipt.status !== INVENTORY_DOCUMENT_STATUSES.POSTED) {
        continue;
      }
      if (receipt.locationId !== params.locationId) {
        continue;
      }
      if (inboundExpectedScopeKey(receipt) !== params.scopeKey) {
        continue;
      }
      const lines = await this.deps.receiptLines.listByHeader(params.businessId, receipt.id);
      for (const line of lines) {
        if (line.stockItemId !== params.stockItemId) {
          continue;
        }
        total = applyInboundQuantity(total, line.baseQuantity);
      }
    }
    return total;
  }

  private async toLineViews(params: {
    businessId: string;
    locationId: string;
    lines: InventoryInboundLineRecord[];
    includeExpected: boolean;
    scopeKey: string;
  }): Promise<InventoryInboundLineView[]> {
    const views: InventoryInboundLineView[] = [];
    const postedByItem = new Map<string, string>();
    if (params.includeExpected) {
      const uniqueItems = [...new Set(params.lines.map((line) => line.stockItemId))];
      for (const stockItemId of uniqueItems) {
        postedByItem.set(
          stockItemId,
          await this.postedReceivedBase({
            businessId: params.businessId,
            locationId: params.locationId,
            stockItemId,
            scopeKey: params.scopeKey,
          })
        );
      }
    }
    for (const line of params.lines) {
      const item = await this.deps.stockItems.findById(params.businessId, line.stockItemId);
      const enteredUnit = await this.deps.units.findById(params.businessId, line.uomId);
      const baseUnit = item
        ? await this.deps.units.findById(params.businessId, item.baseUomId)
        : null;
      const balance = await this.deps.balances.findByItemAndLocation(
        params.businessId,
        line.stockItemId,
        params.locationId
      );
      const expectedBase =
        params.includeExpected && line.expectedQuantity
          ? (multiplyInventoryAmount(line.expectedQuantity, line.conversionFactor) ??
            line.expectedQuantity)
          : null;
      const receivedQuantity = params.includeExpected
        ? (postedByItem.get(line.stockItemId) ?? "0")
        : null;
      views.push({
        id: line.id,
        lineNumber: line.lineNumber,
        stockItemId: line.stockItemId,
        sku: item?.sku ?? "",
        productName: item?.sku ?? "",
        quantity: line.quantity,
        expectedQuantity: expectedBase,
        receivedQuantity,
        remainingQuantity:
          expectedBase && receivedQuantity !== null
            ? remainingQuantity(expectedBase, receivedQuantity)
            : null,
        uomCode: enteredUnit?.code ?? "",
        baseQuantity: line.baseQuantity,
        baseUomCode: baseUnit?.code ?? enteredUnit?.code ?? "",
        conversionFactor: line.conversionFactor,
        onHand: balance?.onHand ?? "0",
        unitCost: line.unitCost,
        lineTotal: line.lineTotal,
        currencyCode: line.currencyCode,
        movementId: line.movementId,
      });
    }
    return views;
  }
}

function sumQuantities(values: string[]): string {
  return values.reduce((total, value) => String(Number(total) + Number(value)), "0");
}

function sumValues(values: Array<string | null>): string | null {
  const present = values.filter((value): value is string => value !== null);
  if (present.length === 0) {
    return null;
  }
  return present.reduce((total, value) => String(Number(total) + Number(value)), "0");
}

export function createDefaultStockReceivingDependencies(): StockReceivingServiceDependencies {
  const controls = createInventoryOperationControlRepository();
  const locks = createInProcessInventoryLock();
  return {
    stockItems: createStockItemRepository(),
    locations: createInventoryLocationRepository(),
    itemLocations: createStockItemLocationRepository(),
    movements: createInventoryMovementRepository(),
    balances: createInventoryBalanceRepository(),
    receipts: createInventoryReceiptRepository(),
    receiptLines: createInventoryReceiptLineRepository(),
    openings: createInventoryOpeningBalanceRepository(),
    openingLines: createInventoryOpeningBalanceLineRepository(),
    controls,
    suppliers: createInventorySupplierAdapter(),
    units: createUnitOfMeasureAdapter(),
    numbering: new ConfigurableDocumentNumberingService(
      createDocumentNumberingPolicyRepository()
    ),
    workflow: createInventoryControlWorkflowAdapter(controls),
    idempotency: createInventoryIdempotencyRepository(),
    locks,
    audit: createInventoryAuditAdapter(),
    traceability: createTraceabilityService({
      ...createDefaultTraceabilityDependencies(locks),
    }),
    opsIncidents: createInventoryOpsIncidentService(),
  };
}

export function createStockReceivingService(deps?: StockReceivingServiceDependencies) {
  return new StockReceivingService(deps ?? createDefaultStockReceivingDependencies());
}
