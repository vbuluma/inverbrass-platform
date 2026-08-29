/**
 * Purpose:
 * Stock transfers between configured locations. Physical quantity changes
 * post through the inventory ledger. In-transit is derived from transfer
 * documents, not a second balance table.
 *
 * Implementation Package:
 * BP-008 / IP-04 – Stock Transfers & Multi-Location
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  applyInboundQuantity,
  compareInventoryQuantity,
  isNonNegativeInventoryQuantity,
} from "@/core/inventory-engine";
import {
  DOCUMENT_NUMBERING_DOCUMENT_TYPES,
  type DocumentNumberingPort,
} from "@/core/localization-regulatory/document-numbering";
import { ConfigurableDocumentNumberingService } from "@/core/localization-regulatory/services/document-numbering-service";
import { createDocumentNumberingPolicyRepository } from "@/core/localization-regulatory/repositories/document-numbering-policy-repository";
import {
  WORKFLOW_ENGINE_ERROR_CODES,
  WorkflowEngineError,
  type WorkflowEnginePort,
} from "@/core/workflow-engine";
import { createBusinessScopedLocationAccess } from "@/modules/inventory/adapters/inventory-location-access-adapter";
import { createInventoryControlWorkflowAdapter } from "@/modules/inventory/adapters/inventory-control-workflow-adapter";
import { createUnitOfMeasureAdapter } from "@/modules/inventory/adapters/unit-of-measure-adapter";
import {
  INVENTORY_AUDIT_ACTIONS,
  INVENTORY_IDEMPOTENCY_OPERATIONS,
  INVENTORY_OPERATION_CODES,
  INVENTORY_OPS_INCIDENT_TYPES,
  INVENTORY_OVER_RECEIPT_POLICIES,
  INVENTORY_TRANSFER_STATUSES,
  STOCK_ITEM_TYPE_CODES,
} from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryAuditPort,
  InventoryBalanceRepositoryPort,
  InventoryIdempotencyPort,
  InventoryLocationAccessPort,
  InventoryLocationRepositoryPort,
  InventoryLockPort,
  InventoryMovementRepositoryPort,
  InventoryOperationControlPort,
  InventoryOpsIncidentPort,
  InventoryTraceabilityPort,
  InventoryTransferLineRepositoryPort,
  InventoryTransferRepositoryPort,
  InventoryUnitCataloguePort,
  StockItemLocationRepositoryPort,
  StockItemRepositoryPort,
} from "@/modules/inventory/ports";
import { createInventoryBalanceRepository } from "@/modules/inventory/repositories/inventory-balance-repository";
import { createInventoryIdempotencyRepository } from "@/modules/inventory/repositories/inventory-idempotency-repository";
import { createInventoryLocationRepository } from "@/modules/inventory/repositories/inventory-location-repository";
import { createInventoryMovementRepository } from "@/modules/inventory/repositories/inventory-movement-repository";
import { createInventoryOperationControlRepository } from "@/modules/inventory/repositories/inventory-operation-control-repository";
import {
  createInventoryTransferLineRepository,
  createInventoryTransferRepository,
} from "@/modules/inventory/repositories/inventory-transfer-repository";
import { createStockItemLocationRepository } from "@/modules/inventory/repositories/stock-item-location-repository";
import { createStockItemRepository } from "@/modules/inventory/repositories/stock-item-repository";
import { createInventoryAuditAdapter } from "@/modules/inventory/services/inventory-audit-helper";
import {
  resolveInboundBaseQuantity,
} from "@/modules/inventory/services/inventory-inbound-rules";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import { recordDetectedOpsIncident } from "@/modules/inventory/services/inventory-ops-incident-hook";
import { createInventoryOpsIncidentService } from "@/modules/inventory/services/inventory-ops-incident-service";
import { assertSufficientAvailable } from "@/modules/inventory/services/inventory-reservation-rules";
import {
  captureFromCommand,
  createDefaultTraceabilityDependencies,
  createTraceabilityService,
  requireModePort,
} from "@/modules/inventory/services/inventory-traceability-service";
import { trackingModeOf } from "@/modules/inventory/services/inventory-traceability-rules";
import {
  postTransferDispatchToLedger,
  postTransferReceiptToLedger,
} from "@/modules/inventory/services/inventory-transfer-posting";
import {
  assertDistinctLocations,
  assertTransferCancellable,
  assertTransferOverReceipt,
  assertTransferTransition,
  discrepancyFromReceipt,
  isInTransitStatus,
  remainingInTransit,
} from "@/modules/inventory/services/inventory-transfer-rules";
import { normalizeOptionalText } from "@/modules/inventory/services/stock-item-rules";
import type {
  CreateTransferCommand,
  InventoryAvailabilityView,
  InventoryTransferLineView,
  InventoryTransferRecord,
  InventoryTransferSummary,
  InventoryTransferView,
  ReceiveTransferCommand,
  StockItemRecord,
} from "@/modules/inventory/types";

export type StockTransferServiceDependencies = {
  stockItems: StockItemRepositoryPort;
  locations: InventoryLocationRepositoryPort;
  itemLocations: StockItemLocationRepositoryPort;
  movements: InventoryMovementRepositoryPort;
  balances: InventoryBalanceRepositoryPort;
  transfers: InventoryTransferRepositoryPort;
  transferLines: InventoryTransferLineRepositoryPort;
  controls: InventoryOperationControlPort;
  units: InventoryUnitCataloguePort;
  numbering: DocumentNumberingPort;
  workflow: WorkflowEnginePort;
  idempotency: InventoryIdempotencyPort;
  locks: InventoryLockPort;
  audit: InventoryAuditPort;
  locationAccess: InventoryLocationAccessPort;
  traceability?: InventoryTraceabilityPort | null;
  opsIncidents?: InventoryOpsIncidentPort;
};

function actorId(context: CurrentBusinessContext): string | null {
  return context.platformUserId || null;
}

function transferUomId(stockItem: StockItemRecord, requestedUomId?: string | null) {
  return requestedUomId?.trim() || stockItem.baseUomId;
}

const OPEN_TRANSFER_STATUSES = new Set<string>([
  INVENTORY_TRANSFER_STATUSES.DRAFT,
  INVENTORY_TRANSFER_STATUSES.REQUESTED,
  INVENTORY_TRANSFER_STATUSES.APPROVAL_PENDING,
  INVENTORY_TRANSFER_STATUSES.APPROVED,
  INVENTORY_TRANSFER_STATUSES.DISPATCHED,
  INVENTORY_TRANSFER_STATUSES.IN_TRANSIT,
  INVENTORY_TRANSFER_STATUSES.DISCREPANCY,
]);

export class StockTransferService {
  constructor(private readonly deps: StockTransferServiceDependencies) {}

  async listTransfers(context: CurrentBusinessContext) {
    const rows = await this.deps.transfers.listByBusiness(context.businessId);
    const views: InventoryTransferView[] = [];
    for (const row of rows) {
      views.push(await this.toView(context.businessId, row.id));
    }
    return views;
  }

  async getTransfer(context: CurrentBusinessContext, transferId: string) {
    return this.toView(context.businessId, transferId);
  }

  async summarizeTransfers(context: CurrentBusinessContext): Promise<InventoryTransferSummary> {
    const rows = await this.deps.transfers.listByBusiness(context.businessId);
    const open = rows.filter((row) => OPEN_TRANSFER_STATUSES.has(row.status));
    const transitLines = await this.deps.transferLines.listOpenInTransit(context.businessId);
    let inTransitQuantity = "0";
    for (const line of transitLines) {
      inTransitQuantity = applyInboundQuantity(
        inTransitQuantity,
        remainingInTransit(line.baseQuantity, line.receivedQuantity)
      );
    }
    return {
      openTransferCount: open.length,
      inTransitQuantity,
    };
  }

  async enrichAvailability(
    context: CurrentBusinessContext,
    rows: InventoryAvailabilityView[]
  ): Promise<InventoryAvailabilityView[]> {
    const transit = await this.inTransitByItemLocation(context);
    const merged = rows.map((row) => ({
      ...row,
      inTransit: transit.get(`${row.stockItemId}:${row.locationId}`) ?? "0",
    }));
    const seen = new Set(merged.map((row) => `${row.stockItemId}:${row.locationId}`));
    for (const [key, quantity] of transit.entries()) {
      if (seen.has(key) || quantity === "0") {
        continue;
      }
      const [stockItemId, locationId] = key.split(":");
      if (!stockItemId || !locationId) {
        continue;
      }
      const item = await this.deps.stockItems.findById(context.businessId, stockItemId);
      const location = await this.deps.locations.findById(context.businessId, locationId);
      const unit = item ? await this.deps.units.findById(context.businessId, item.baseUomId) : null;
      merged.push({
        stockItemId,
        sku: item?.sku ?? "",
        locationId,
        locationName: location?.name ?? "",
        onHand: "0",
        reserved: "0",
        available: "0",
        inTransit: quantity,
        uomCode: unit?.code ?? "",
        availabilityLabel: "In transit",
      });
    }
    return merged;
  }

  async inTransitByItemLocation(context: CurrentBusinessContext) {
    const rows = await this.deps.transfers.listByBusiness(context.businessId);
    const open = new Map(
      rows.filter((row) => isInTransitStatus(row.status)).map((row) => [row.id, row])
    );
    const lines = await this.deps.transferLines.listOpenInTransit(context.businessId);
    const totals = new Map<string, string>();
    for (const line of lines) {
      const header = open.get(line.transferId);
      if (!header) {
        continue;
      }
      const key = `${line.stockItemId}:${header.destinationLocationId}`;
      const remaining = remainingInTransit(line.baseQuantity, line.receivedQuantity);
      totals.set(key, applyInboundQuantity(totals.get(key) ?? "0", remaining));
    }
    return totals;
  }

  async createTransfer(context: CurrentBusinessContext, command: CreateTransferCommand) {
    const businessId = context.businessId;
    assertDistinctLocations(command.sourceLocationId, command.destinationLocationId);
    await this.deps.locationAccess.assertCanOperate(context, command.sourceLocationId);
    await this.deps.locationAccess.assertCanOperate(context, command.destinationLocationId);
    const source = await this.requireActiveLocation(businessId, command.sourceLocationId);
    const destination = await this.requireActiveLocation(businessId, command.destinationLocationId);
    const idempotencyKey = normalizeOptionalText(command.idempotencyKey);
    if (idempotencyKey) {
      const existing = await this.deps.transfers.findByIdempotencyKey(businessId, idempotencyKey);
      if (existing) {
        return this.toView(businessId, existing.id);
      }
    }
    if (!command.lines.length) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LINE_REQUIRED);
    }
    const allocated = await this.deps.numbering.allocate({
      businessId,
      documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.STOCK_TRANSFER,
    });
    const header = await this.deps.transfers.insert({
      businessId,
      transferNumber: allocated.number,
      status: INVENTORY_TRANSFER_STATUSES.DRAFT,
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      reason: normalizeOptionalText(command.reason),
      notes: normalizeOptionalText(command.notes),
      requestedBy: null,
      requestedAt: null,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      dispatchedBy: null,
      dispatchedAt: null,
      receivedBy: null,
      receivedAt: null,
      completedAt: null,
      cancelledBy: null,
      cancelledAt: null,
      cancellationReason: null,
      idempotencyKey,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    let lineNumber = 1;
    for (const line of command.lines) {
      const stockItem = await this.requireTransferStockItem(
        businessId,
        line.stockItemId,
        source.id,
        destination.id
      );
      const uomId = transferUomId(stockItem, line.uomId);
      await this.requireUnit(businessId, uomId);
      const converted = resolveInboundBaseQuantity({
        enteredQuantity: line.quantity,
        enteredUomId: uomId,
        stockItem,
      });
      const created = await this.deps.transferLines.insert({
        businessId,
        transferId: header.id,
        lineNumber,
        stockItemId: stockItem.id,
        quantity: converted.enteredQuantity,
        uomId: converted.enteredUomId,
        baseQuantity: converted.baseQuantity,
        conversionFactor: converted.conversionFactor,
        receivedQuantity: null,
        discrepancyQuantity: null,
        dispatchMovementId: null,
        receiptMovementId: null,
        notes: normalizeOptionalText(line.notes),
        updatedBy: actorId(context),
      });
      lineNumber += 1;
      requireModePort(trackingModeOf(stockItem), this.deps.traceability);
      await this.deps.traceability?.captureLine(context, {
        sourceType: "TRANSFER",
        sourceId: header.id,
        sourceLineId: created.id,
        stockItem,
        capture: captureFromCommand(line),
        baseQuantity: converted.baseQuantity,
        direction: "OUT",
      });
    }
    if (idempotencyKey) {
      await this.remember(
        businessId,
        INVENTORY_IDEMPOTENCY_OPERATIONS.CREATE_TRANSFER,
        idempotencyKey,
        header.id,
        actorId(context)
      );
    }
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.TRANSFER_CREATED, {
      transferNumber: header.transferNumber,
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      previousStatus: null,
      newStatus: header.status,
    });
    return this.toView(businessId, header.id);
  }

  async requestTransfer(context: CurrentBusinessContext, transferId: string) {
    const businessId = context.businessId;
    const header = await this.requireTransfer(businessId, transferId);
    if (
      header.status === INVENTORY_TRANSFER_STATUSES.REQUESTED ||
      header.status === INVENTORY_TRANSFER_STATUSES.APPROVAL_PENDING
    ) {
      return this.toView(businessId, header.id);
    }
    assertTransferTransition(header.status, INVENTORY_TRANSFER_STATUSES.REQUESTED);
    await this.deps.locationAccess.assertCanOperate(context, header.sourceLocationId);
    const decision = await this.approvalDecision(businessId);
    const nextStatus = decision.required
      ? INVENTORY_TRANSFER_STATUSES.APPROVAL_PENDING
      : INVENTORY_TRANSFER_STATUSES.REQUESTED;
    assertTransferTransition(header.status, nextStatus);
    await this.deps.transfers.update(businessId, header.id, {
      status: nextStatus,
      requestedBy: actorId(context),
      requestedAt: new Date(),
      updatedBy: actorId(context),
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.TRANSFER_REQUESTED, {
      transferNumber: header.transferNumber,
      previousStatus: header.status,
      newStatus: nextStatus,
      approvalRequired: decision.required,
    });
    return this.toView(businessId, header.id);
  }

  async approveTransfer(
    context: CurrentBusinessContext,
    transferId: string,
    idempotencyKey?: string | null
  ) {
    const businessId = context.businessId;
    const key =
      normalizeOptionalText(idempotencyKey) ??
      `${INVENTORY_IDEMPOTENCY_OPERATIONS.APPROVE_TRANSFER}:${transferId}`;
    const remembered = await this.findRemembered(businessId, INVENTORY_IDEMPOTENCY_OPERATIONS.APPROVE_TRANSFER, key);
    if (remembered) {
      return this.toView(businessId, remembered);
    }
    const header = await this.requireTransfer(businessId, transferId);
    if (header.status === INVENTORY_TRANSFER_STATUSES.APPROVED) {
      return this.toView(businessId, header.id);
    }
    assertTransferTransition(header.status, INVENTORY_TRANSFER_STATUSES.APPROVED);
    this.assertChecker(header.requestedBy, actorId(context));
    await this.deps.transfers.update(businessId, header.id, {
      status: INVENTORY_TRANSFER_STATUSES.APPROVED,
      approvedBy: actorId(context),
      approvedAt: new Date(),
      updatedBy: actorId(context),
    });
    await this.remember(
      businessId,
      INVENTORY_IDEMPOTENCY_OPERATIONS.APPROVE_TRANSFER,
      key,
      header.id,
      actorId(context)
    );
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.TRANSFER_APPROVED, {
      transferNumber: header.transferNumber,
      previousStatus: header.status,
      newStatus: INVENTORY_TRANSFER_STATUSES.APPROVED,
      sourceLocationId: header.sourceLocationId,
      destinationLocationId: header.destinationLocationId,
    });
    return this.toView(businessId, header.id);
  }

  async rejectTransfer(
    context: CurrentBusinessContext,
    transferId: string,
    reason: string,
    idempotencyKey?: string | null
  ) {
    const businessId = context.businessId;
    const key =
      normalizeOptionalText(idempotencyKey) ??
      `${INVENTORY_IDEMPOTENCY_OPERATIONS.REJECT_TRANSFER}:${transferId}`;
    const remembered = await this.findRemembered(businessId, INVENTORY_IDEMPOTENCY_OPERATIONS.REJECT_TRANSFER, key);
    if (remembered) {
      return this.toView(businessId, remembered);
    }
    const header = await this.requireTransfer(businessId, transferId);
    if (header.status === INVENTORY_TRANSFER_STATUSES.REJECTED) {
      return this.toView(businessId, header.id);
    }
    const rejectionReason = normalizeOptionalText(reason);
    if (!rejectionReason) {
      throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "reason",
      });
    }
    assertTransferTransition(header.status, INVENTORY_TRANSFER_STATUSES.REJECTED);
    this.assertChecker(header.requestedBy, actorId(context));
    await this.deps.transfers.update(businessId, header.id, {
      status: INVENTORY_TRANSFER_STATUSES.REJECTED,
      rejectedBy: actorId(context),
      rejectedAt: new Date(),
      rejectionReason,
      updatedBy: actorId(context),
    });
    await this.remember(
      businessId,
      INVENTORY_IDEMPOTENCY_OPERATIONS.REJECT_TRANSFER,
      key,
      header.id,
      actorId(context)
    );
    await this.audit(
      context,
      header.id,
      INVENTORY_AUDIT_ACTIONS.TRANSFER_REJECTED,
      {
        transferNumber: header.transferNumber,
        previousStatus: header.status,
        newStatus: INVENTORY_TRANSFER_STATUSES.REJECTED,
      },
      rejectionReason
    );
    return this.toView(businessId, header.id);
  }

  async dispatchTransfer(
    context: CurrentBusinessContext,
    transferId: string,
    idempotencyKey?: string | null
  ) {
    const businessId = context.businessId;
    const header = await this.requireTransfer(businessId, transferId);
    await this.deps.locationAccess.assertCanOperate(context, header.sourceLocationId);
    const key =
      normalizeOptionalText(idempotencyKey) ??
      `${INVENTORY_IDEMPOTENCY_OPERATIONS.DISPATCH_TRANSFER}:${header.id}`;
    if (isInTransitStatus(header.status) || header.status === INVENTORY_TRANSFER_STATUSES.RECEIVED || header.status === INVENTORY_TRANSFER_STATUSES.COMPLETED) {
      return this.toView(businessId, header.id);
    }
    const decision = await this.approvalDecision(businessId);
    if (decision.required && header.status !== INVENTORY_TRANSFER_STATUSES.APPROVED) {
      throw new InventoryError(INVENTORY_ERROR_CODES.APPROVAL_REQUIRED);
    }
    if (
      !decision.required &&
      header.status !== INVENTORY_TRANSFER_STATUSES.REQUESTED &&
      header.status !== INVENTORY_TRANSFER_STATUSES.APPROVED
    ) {
      throw new InventoryError(INVENTORY_ERROR_CODES.TRANSFER_NOT_ACTIONABLE);
    }
    const lines = await this.deps.transferLines.listByHeader(businessId, header.id);
    if (lines.length === 0) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LINE_REQUIRED);
    }
    const lockKeys = [
      ...new Set(
        lines.map(
          (line) => `${businessId}:availability:${line.stockItemId}:${header.sourceLocationId}`
        )
      ),
      `${businessId}:transfer:${header.id}`,
    ].sort();
    return this.runLocks(lockKeys, async () => {
      const current = await this.requireTransfer(businessId, transferId);
      if (
        isInTransitStatus(current.status) ||
        current.status === INVENTORY_TRANSFER_STATUSES.RECEIVED ||
        current.status === INVENTORY_TRANSFER_STATUSES.COMPLETED
      ) {
        return this.toView(businessId, current.id);
      }
      const remembered = await this.findRemembered(
        businessId,
        INVENTORY_IDEMPOTENCY_OPERATIONS.DISPATCH_TRANSFER,
        key
      );
      if (remembered) {
        return this.toView(businessId, remembered);
      }
      const source = await this.requireActiveLocation(businessId, current.sourceLocationId);
      const currentLines = await this.deps.transferLines.listByHeader(businessId, current.id);
      for (const line of currentLines) {
        const stockItem = await this.requireTransferStockItem(
          businessId,
          line.stockItemId,
          current.sourceLocationId,
          current.destinationLocationId
        );
        const balance = await this.deps.balances.findByItemAndLocation(
          businessId,
          stockItem.id,
          source.id
        );
        assertSufficientAvailable({
          requestedBase: line.baseQuantity,
          available: balance?.available ?? "0",
          policy: INVENTORY_OVER_RECEIPT_POLICIES.BLOCK,
        });
        const movement = await postTransferDispatchToLedger({
          businessId,
          actorId: actorId(context),
          stockItem,
          location: source,
          line,
          transfer: current,
          ledgerQuantity: line.baseQuantity,
          ledgerUomId: stockItem.baseUomId,
          conversionFactor: line.conversionFactor,
          reason: current.reason,
          movements: this.deps.movements,
          balances: this.deps.balances,
        });
        requireModePort(trackingModeOf(stockItem), this.deps.traceability);
        const capture = await this.deps.traceability?.getCapture(context, "TRANSFER", line.id);
        await this.deps.traceability?.applyOutbound({
          context,
          stockItem,
          locationId: source.id,
          movementId: movement.id,
          sourceType: "TRANSFER",
          sourceId: current.id,
          sourceLineId: line.id,
          baseQuantity: line.baseQuantity,
          capture,
        });
        await this.deps.transferLines.update(businessId, line.id, {
          dispatchMovementId: movement.id,
          updatedBy: actorId(context),
        });
      }
      assertTransferTransition(current.status, INVENTORY_TRANSFER_STATUSES.IN_TRANSIT);
      await this.deps.transfers.update(businessId, current.id, {
        status: INVENTORY_TRANSFER_STATUSES.IN_TRANSIT,
        dispatchedBy: actorId(context),
        dispatchedAt: new Date(),
        updatedBy: actorId(context),
      });
      await this.remember(
        businessId,
        INVENTORY_IDEMPOTENCY_OPERATIONS.DISPATCH_TRANSFER,
        key,
        current.id,
        actorId(context)
      );
      await this.audit(context, current.id, INVENTORY_AUDIT_ACTIONS.TRANSFER_DISPATCHED, {
        transferNumber: current.transferNumber,
        previousStatus: current.status,
        newStatus: INVENTORY_TRANSFER_STATUSES.IN_TRANSIT,
        sourceLocationId: current.sourceLocationId,
        destinationLocationId: current.destinationLocationId,
      });
      return this.toView(businessId, current.id);
    });
  }

  async receiveTransfer(
    context: CurrentBusinessContext,
    command: ReceiveTransferCommand,
    idempotencyKey?: string | null
  ) {
    const businessId = context.businessId;
    const header = await this.requireTransfer(businessId, command.transferId);
    await this.deps.locationAccess.assertCanOperate(context, header.destinationLocationId);
    const key =
      normalizeOptionalText(idempotencyKey) ??
      `${INVENTORY_IDEMPOTENCY_OPERATIONS.RECEIVE_TRANSFER}:${header.id}`;
    if (
      header.status === INVENTORY_TRANSFER_STATUSES.RECEIVED ||
      header.status === INVENTORY_TRANSFER_STATUSES.COMPLETED
    ) {
      return this.toView(businessId, header.id);
    }
    if (!isInTransitStatus(header.status)) {
      throw new InventoryError(INVENTORY_ERROR_CODES.TRANSFER_NOT_ACTIONABLE);
    }
    if (!command.lines.length) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LINE_REQUIRED);
    }
    const lines = await this.deps.transferLines.listByHeader(businessId, header.id);
    const lockKeys = [
      `${businessId}:transfer:${header.id}`,
      ...new Set(
        lines.map(
          (line) => `${businessId}:availability:${line.stockItemId}:${header.destinationLocationId}`
        )
      ),
    ].sort();
    return this.runLocks(lockKeys, async () => {
      const current = await this.requireTransfer(businessId, command.transferId);
      if (
        current.status === INVENTORY_TRANSFER_STATUSES.RECEIVED ||
        current.status === INVENTORY_TRANSFER_STATUSES.COMPLETED
      ) {
        return this.toView(businessId, current.id);
      }
      const remembered = await this.findRemembered(
        businessId,
        INVENTORY_IDEMPOTENCY_OPERATIONS.RECEIVE_TRANSFER,
        key
      );
      if (remembered) {
        return this.toView(businessId, remembered);
      }
      if (!isInTransitStatus(current.status)) {
        throw new InventoryError(INVENTORY_ERROR_CODES.TRANSFER_NOT_ACTIONABLE);
      }
      const destination = await this.requireActiveLocation(
        businessId,
        current.destinationLocationId
      );
      const currentLines = await this.deps.transferLines.listByHeader(businessId, current.id);
      const byId = new Map(currentLines.map((line) => [line.id, line]));
      let hasDiscrepancy = false;
      for (const receipt of command.lines) {
        const line = byId.get(receipt.lineId);
        if (!line || line.businessId !== businessId) {
          throw new InventoryError(INVENTORY_ERROR_CODES.TRANSFER_NOT_FOUND, undefined, 404);
        }
        if (!isNonNegativeInventoryQuantity(receipt.receivedQuantity.trim())) {
          throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_QUANTITY, undefined, 400, {
            field: "receivedQuantity",
          });
        }
        const stockItem = await this.requireTransferStockItem(
          businessId,
          line.stockItemId,
          current.sourceLocationId,
          current.destinationLocationId
        );
        const enteredReceived = receipt.receivedQuantity.trim();
        const converted =
          compareInventoryQuantity(enteredReceived, "0") === 0
            ? {
                enteredQuantity: "0",
                enteredUomId: line.uomId,
                baseQuantity: "0",
                conversionFactor: line.conversionFactor ?? "1",
              }
            : resolveInboundBaseQuantity({
                enteredQuantity: enteredReceived,
                enteredUomId: line.uomId,
                stockItem,
              });
        assertTransferOverReceipt(converted.baseQuantity, line.baseQuantity);
        const discrepancy = discrepancyFromReceipt(line.baseQuantity, converted.baseQuantity);
        if (discrepancy !== "0") {
          hasDiscrepancy = true;
        }
        if (line.receiptMovementId) {
          continue;
        }
        let movementId: string | null = null;
        if (compareInventoryQuantity(converted.baseQuantity, "0") > 0) {
          const movement = await postTransferReceiptToLedger({
            businessId,
            actorId: actorId(context),
            stockItem,
            location: destination,
            line,
            transfer: current,
            ledgerQuantity: converted.baseQuantity,
            ledgerUomId: stockItem.baseUomId,
            conversionFactor: converted.conversionFactor,
            reason: normalizeOptionalText(command.notes) ?? current.reason,
            movements: this.deps.movements,
            balances: this.deps.balances,
          });
          movementId = movement.id;
          requireModePort(trackingModeOf(stockItem), this.deps.traceability);
          await this.deps.traceability?.applyInbound({
            context,
            stockItem,
            locationId: destination.id,
            movementId: movement.id,
            sourceType: "TRANSFER",
            sourceId: current.id,
            sourceLineId: line.id,
            baseQuantity: converted.baseQuantity,
            capture: captureFromCommand(receipt),
          });
        }
        await this.deps.transferLines.update(businessId, line.id, {
          receivedQuantity: converted.baseQuantity,
          discrepancyQuantity: discrepancy,
          receiptMovementId: movementId,
          updatedBy: actorId(context),
        });
      }
      const nextStatus = hasDiscrepancy
        ? INVENTORY_TRANSFER_STATUSES.DISCREPANCY
        : INVENTORY_TRANSFER_STATUSES.RECEIVED;
      assertTransferTransition(current.status, nextStatus);
      await this.deps.transfers.update(businessId, current.id, {
        status: nextStatus,
        receivedBy: actorId(context),
        receivedAt: new Date(),
        notes: normalizeOptionalText(command.notes) ?? current.notes,
        updatedBy: actorId(context),
      });
      await this.remember(
        businessId,
        INVENTORY_IDEMPOTENCY_OPERATIONS.RECEIVE_TRANSFER,
        key,
        current.id,
        actorId(context)
      );
      await this.audit(
        context,
        current.id,
        hasDiscrepancy
          ? INVENTORY_AUDIT_ACTIONS.TRANSFER_DISCREPANCY
          : INVENTORY_AUDIT_ACTIONS.TRANSFER_RECEIVED,
        {
          transferNumber: current.transferNumber,
          previousStatus: current.status,
          newStatus: nextStatus,
          sourceLocationId: current.sourceLocationId,
          destinationLocationId: current.destinationLocationId,
        }
      );
      if (hasDiscrepancy) {
        const firstLine = currentLines[0];
        await recordDetectedOpsIncident(this.deps.opsIncidents, context, {
          incidentType: INVENTORY_OPS_INCIDENT_TYPES.TRANSFER_EXCEPTION,
          severity: "HIGH",
          sourceType: "TRANSFER",
          sourceId: current.id,
          stockItemId: firstLine?.stockItemId ?? null,
          locationId: current.destinationLocationId,
          description: "Transfer received short of the dispatched quantity.",
          idempotencyKey: `TRANSFER_EXCEPTION:${current.id}`,
        });
      } else {
        return this.completeTransfer(context, current.id);
      }
      return this.toView(businessId, current.id);
    });
  }

  async completeTransfer(
    context: CurrentBusinessContext,
    transferId: string,
    idempotencyKey?: string | null
  ) {
    const businessId = context.businessId;
    const key =
      normalizeOptionalText(idempotencyKey) ??
      `${INVENTORY_IDEMPOTENCY_OPERATIONS.COMPLETE_TRANSFER}:${transferId}`;
    const remembered = await this.findRemembered(
      businessId,
      INVENTORY_IDEMPOTENCY_OPERATIONS.COMPLETE_TRANSFER,
      key
    );
    if (remembered) {
      return this.toView(businessId, remembered);
    }
    const header = await this.requireTransfer(businessId, transferId);
    if (header.status === INVENTORY_TRANSFER_STATUSES.COMPLETED) {
      return this.toView(businessId, header.id);
    }
    assertTransferTransition(header.status, INVENTORY_TRANSFER_STATUSES.COMPLETED);
    await this.deps.transfers.update(businessId, header.id, {
      status: INVENTORY_TRANSFER_STATUSES.COMPLETED,
      completedAt: new Date(),
      updatedBy: actorId(context),
    });
    await this.remember(
      businessId,
      INVENTORY_IDEMPOTENCY_OPERATIONS.COMPLETE_TRANSFER,
      key,
      header.id,
      actorId(context)
    );
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.TRANSFER_COMPLETED, {
      transferNumber: header.transferNumber,
      previousStatus: header.status,
      newStatus: INVENTORY_TRANSFER_STATUSES.COMPLETED,
    });
    return this.toView(businessId, header.id);
  }

  async cancelTransfer(
    context: CurrentBusinessContext,
    transferId: string,
    reason?: string | null,
    idempotencyKey?: string | null
  ) {
    const businessId = context.businessId;
    const key =
      normalizeOptionalText(idempotencyKey) ??
      `${INVENTORY_IDEMPOTENCY_OPERATIONS.CANCEL_TRANSFER}:${transferId}`;
    const remembered = await this.findRemembered(
      businessId,
      INVENTORY_IDEMPOTENCY_OPERATIONS.CANCEL_TRANSFER,
      key
    );
    if (remembered) {
      return this.toView(businessId, remembered);
    }
    const header = await this.requireTransfer(businessId, transferId);
    if (header.status === INVENTORY_TRANSFER_STATUSES.CANCELLED) {
      return this.toView(businessId, header.id);
    }
    if (
      isInTransitStatus(header.status) ||
      header.status === INVENTORY_TRANSFER_STATUSES.RECEIVED ||
      header.status === INVENTORY_TRANSFER_STATUSES.COMPLETED
    ) {
      throw new InventoryError(INVENTORY_ERROR_CODES.TRANSFER_ALREADY_DISPATCHED);
    }
    assertTransferCancellable(header.status);
    assertTransferTransition(header.status, INVENTORY_TRANSFER_STATUSES.CANCELLED);
    const cancellationReason = normalizeOptionalText(reason);
    await this.deps.transfers.update(businessId, header.id, {
      status: INVENTORY_TRANSFER_STATUSES.CANCELLED,
      cancelledBy: actorId(context),
      cancelledAt: new Date(),
      cancellationReason,
      updatedBy: actorId(context),
    });
    await this.remember(
      businessId,
      INVENTORY_IDEMPOTENCY_OPERATIONS.CANCEL_TRANSFER,
      key,
      header.id,
      actorId(context)
    );
    await this.audit(
      context,
      header.id,
      INVENTORY_AUDIT_ACTIONS.TRANSFER_CANCELLED,
      {
        transferNumber: header.transferNumber,
        previousStatus: header.status,
        newStatus: INVENTORY_TRANSFER_STATUSES.CANCELLED,
      },
      cancellationReason
    );
    return this.toView(businessId, header.id);
  }

  private async runLocks<T>(keys: string[], work: () => Promise<T>): Promise<T> {
    const run = async (index: number): Promise<T> => {
      if (index >= keys.length) {
        return work();
      }
      return this.deps.locks.runExclusive(keys[index] ?? "", () => run(index + 1));
    };
    return run(0);
  }

  private async approvalDecision(businessId: string) {
    const control = await this.requireControl(businessId, INVENTORY_OPERATION_CODES.STOCK_TRANSFER);
    return this.deps.workflow.evaluateOperationApproval({
      businessId,
      operationCode: control.code,
    });
  }

  private assertChecker(requestedBy: string | null, checkerId: string | null) {
    try {
      this.deps.workflow.assertDistinctActors(
        requestedBy ?? "",
        checkerId ?? "",
        "The person who requested this transfer cannot approve it."
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

  private async remember(
    businessId: string,
    operationType: string,
    idempotencyKey: string,
    resourceId: string,
    createdBy: string | null
  ) {
    const existing = await this.deps.idempotency.find(businessId, operationType, idempotencyKey);
    if (existing) {
      return;
    }
    await this.deps.idempotency.insert({
      businessId,
      idempotencyKey,
      operationType,
      resourceType: "inventory_transfer",
      resourceId,
      createdBy,
    });
  }

  private async findRemembered(businessId: string, operationType: string, idempotencyKey: string) {
    const existing = await this.deps.idempotency.find(businessId, operationType, idempotencyKey);
    return existing?.resourceId ?? null;
  }

  private async requireControl(businessId: string, operationCode: string) {
    const control = await this.deps.controls.getControl(businessId, operationCode);
    if (!control) {
      throw new InventoryError(INVENTORY_ERROR_CODES.OPERATION_CONTROL_MISSING, undefined, 409);
    }
    return control;
  }

  private async requireTransfer(businessId: string, transferId: string) {
    const row = await this.deps.transfers.findById(businessId, transferId);
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.TRANSFER_NOT_FOUND, undefined, 404);
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

  private async requireTransferStockItem(
    businessId: string,
    stockItemId: string,
    sourceLocationId: string,
    destinationLocationId: string
  ) {
    const stockItem = await this.deps.stockItems.findById(businessId, stockItemId);
    if (!stockItem || stockItem.deletedAt) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCK_ITEM_NOT_FOUND, undefined, 404);
    }
    if (stockItem.itemTypeCode === STOCK_ITEM_TYPE_CODES.NON_STOCK_ITEM) {
      throw new InventoryError(INVENTORY_ERROR_CODES.NON_STOCK_CANNOT_CREATE_BALANCE);
    }
    if (!stockItem.stockTrackingEnabled) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCK_TRACKING_REQUIRED);
    }
    const sourceConfig = await this.deps.itemLocations.findByItemAndLocation(
      businessId,
      stockItem.id,
      sourceLocationId
    );
    const destinationConfig = await this.deps.itemLocations.findByItemAndLocation(
      businessId,
      stockItem.id,
      destinationLocationId
    );
    if (!sourceConfig || !sourceConfig.isActive || !destinationConfig || !destinationConfig.isActive) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCK_ITEM_NOT_AT_LOCATION);
    }
    return stockItem;
  }

  private async requireUnit(businessId: string, uomId: string) {
    const unit = await this.deps.units.findById(businessId, uomId);
    if (!unit || unit.status === "ARCHIVED") {
      throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_UOM, undefined, 400, {
        field: "uomId",
      });
    }
    return unit;
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
      entityName: "inventory_transfer",
      entityId,
      action,
      outcome: "SUCCESS",
      reason,
      references,
    });
  }

  private async toView(businessId: string, transferId: string): Promise<InventoryTransferView> {
    const header: InventoryTransferRecord = await this.requireTransfer(businessId, transferId);
    const source = await this.deps.locations.findById(businessId, header.sourceLocationId);
    const destination = await this.deps.locations.findById(
      businessId,
      header.destinationLocationId
    );
    const lines = await this.deps.transferLines.listByHeader(businessId, header.id);
    const lineViews: InventoryTransferLineView[] = [];
    let totalQuantity = "0";
    let totalReceived = "0";
    let totalDiscrepancy = "0";
    let inTransitQuantity = "0";
    for (const line of lines) {
      const item = await this.deps.stockItems.findById(businessId, line.stockItemId);
      const baseUnit = item ? await this.deps.units.findById(businessId, item.baseUomId) : null;
      totalQuantity = applyInboundQuantity(totalQuantity, line.baseQuantity);
      const received = line.receivedQuantity ?? "0";
      totalReceived = applyInboundQuantity(totalReceived, received);
      const discrepancy = line.discrepancyQuantity ?? "0";
      totalDiscrepancy = applyInboundQuantity(totalDiscrepancy, discrepancy);
      if (isInTransitStatus(header.status)) {
        inTransitQuantity = applyInboundQuantity(
          inTransitQuantity,
          remainingInTransit(line.baseQuantity, line.receivedQuantity)
        );
      }
      lineViews.push({
        ...line,
        sku: item?.sku ?? "",
        productName: null,
        baseUomCode: baseUnit?.code ?? null,
      });
    }
    const decision = await this.safeApprovalDecision(businessId);
    return {
      ...header,
      sourceLocationName: source?.name ?? "",
      destinationLocationName: destination?.name ?? "",
      approvalRequired: decision.required,
      totalQuantity,
      totalReceived,
      totalDiscrepancy,
      inTransitQuantity,
      lineCount: lineViews.length,
      lines: lineViews,
    };
  }

  private async safeApprovalDecision(businessId: string) {
    try {
      return await this.approvalDecision(businessId);
    } catch {
      return { required: false, operation: INVENTORY_OPERATION_CODES.STOCK_TRANSFER };
    }
  }
}

export function createDefaultStockTransferDependencies(): StockTransferServiceDependencies {
  const controls = createInventoryOperationControlRepository();
  const locks = createInProcessInventoryLock();
  const locations = createInventoryLocationRepository();
  return {
    stockItems: createStockItemRepository(),
    locations,
    itemLocations: createStockItemLocationRepository(),
    movements: createInventoryMovementRepository(),
    balances: createInventoryBalanceRepository(),
    transfers: createInventoryTransferRepository(),
    transferLines: createInventoryTransferLineRepository(),
    controls,
    units: createUnitOfMeasureAdapter(),
    numbering: new ConfigurableDocumentNumberingService(
      createDocumentNumberingPolicyRepository()
    ),
    workflow: createInventoryControlWorkflowAdapter(controls),
    idempotency: createInventoryIdempotencyRepository(),
    locks,
    audit: createInventoryAuditAdapter(),
    locationAccess: createBusinessScopedLocationAccess(locations),
    traceability: createTraceabilityService({
      ...createDefaultTraceabilityDependencies(locks),
    }),
    opsIncidents: createInventoryOpsIncidentService(),
  };
}

export function createStockTransferService(deps?: StockTransferServiceDependencies) {
  return new StockTransferService(deps ?? createDefaultStockTransferDependencies());
}
