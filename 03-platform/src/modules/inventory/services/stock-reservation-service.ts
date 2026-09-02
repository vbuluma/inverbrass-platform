/**
 * Purpose:
 * Stock reservation and sales deduction. Reservations change reserved
 * quantity only. Deductions post SALE_DEDUCTION through the IP-01 ledger.
 * Concurrency uses the existing in-process inventory lock.
 *
 * Implementation Package:
 * BP-008 / IP-03 – Stock Reservation & Sales Deduction
 */

import { randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { applyInboundQuantity } from "@/core/inventory-engine";
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
  INVENTORY_IDEMPOTENCY_OPERATIONS,
  INVENTORY_OPERATION_CODES,
  INVENTORY_RESERVATION_STATUSES,
  INVENTORY_OPS_INCIDENT_TYPES,
  STOCK_ITEM_TYPE_CODES,
} from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryAuditPort,
  InventoryBalanceRepositoryPort,
  InventoryFulfilmentRepositoryPort,
  InventoryIdempotencyPort,
  InventoryLocationRepositoryPort,
  InventoryLockPort,
  InventoryMovementRepositoryPort,
  InventoryOperationControlPort,
  InventoryOpsIncidentPort,
  InventoryReservationRepositoryPort,
  InventorySalesFulfilmentPort,
  InventoryTraceabilityPort,
  InventoryUnitCataloguePort,
  StockItemLocationRepositoryPort,
  StockItemRepositoryPort,
} from "@/modules/inventory/ports";
import { createInventoryControlWorkflowAdapter } from "@/modules/inventory/adapters/inventory-control-workflow-adapter";
import { createSalesFulfilmentContractAdapter } from "@/modules/inventory/adapters/sales-fulfilment-contract-adapter";
import { createUnitOfMeasureAdapter } from "@/modules/inventory/adapters/unit-of-measure-adapter";
import { createInventoryBalanceRepository } from "@/modules/inventory/repositories/inventory-balance-repository";
import { createInventoryIdempotencyRepository } from "@/modules/inventory/repositories/inventory-idempotency-repository";
import { createInventoryLocationRepository } from "@/modules/inventory/repositories/inventory-location-repository";
import { createInventoryMovementRepository } from "@/modules/inventory/repositories/inventory-movement-repository";
import { createInventoryOperationControlRepository } from "@/modules/inventory/repositories/inventory-operation-control-repository";
import {
  createInventoryFulfilmentRepository,
  createInventoryReservationRepository,
} from "@/modules/inventory/repositories/inventory-reservation-repository";
import { createStockItemLocationRepository } from "@/modules/inventory/repositories/stock-item-location-repository";
import { createStockItemRepository } from "@/modules/inventory/repositories/stock-item-repository";
import { createInventoryAuditAdapter } from "@/modules/inventory/services/inventory-audit-helper";
import {
  resolveInboundBaseQuantity,
  reservationUomId,
} from "@/modules/inventory/services/inventory-inbound-rules";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import { recordDetectedOpsIncident } from "@/modules/inventory/services/inventory-ops-incident-hook";
import { createInventoryOpsIncidentService } from "@/modules/inventory/services/inventory-ops-incident-service";
import { postSaleDeductionToLedger } from "@/modules/inventory/services/inventory-reservation-posting";
import {
  captureFromCommand,
  createDefaultTraceabilityDependencies,
  createTraceabilityService,
  requireModePort,
} from "@/modules/inventory/services/inventory-traceability-service";
import { trackingModeOf } from "@/modules/inventory/services/inventory-traceability-rules";
import {
  assertDeductionWithinReservation,
  assertOnHandCoversDeduction,
  assertSaleCancelled,
  assertSaleDeductible,
  assertSaleReservable,
  assertSufficientAvailable,
  isFulfillableStatus,
  isReleasableStatus,
  isReservationExpired,
  nextReservationStatus,
  remainingReservedQuantity,
  requirePhysicalSaleLine,
  resolveSaleFulfilQuantity,
} from "@/modules/inventory/services/inventory-reservation-rules";
import { normalizeOptionalText } from "@/modules/inventory/services/stock-item-rules";
import { ConfigurableDocumentNumberingService } from "@/core/localization-regulatory/services/document-numbering-service";
import { createDocumentNumberingPolicyRepository } from "@/core/localization-regulatory/repositories/document-numbering-policy-repository";
import type {
  CreateReservationCommand,
  FulfilReservationCommand,
  InventoryAvailabilityView,
  InventoryReservationView,
} from "@/modules/inventory/types";

export type StockReservationServiceDependencies = {
  stockItems: StockItemRepositoryPort;
  locations: InventoryLocationRepositoryPort;
  itemLocations: StockItemLocationRepositoryPort;
  movements: InventoryMovementRepositoryPort;
  balances: InventoryBalanceRepositoryPort;
  reservations: InventoryReservationRepositoryPort;
  fulfilments: InventoryFulfilmentRepositoryPort;
  controls: InventoryOperationControlPort;
  units: InventoryUnitCataloguePort;
  numbering: DocumentNumberingPort;
  workflow: WorkflowEnginePort;
  idempotency: InventoryIdempotencyPort;
  locks: InventoryLockPort;
  audit: InventoryAuditPort;
  salesFulfilment?: InventorySalesFulfilmentPort | null;
  traceability?: InventoryTraceabilityPort | null;
  opsIncidents?: InventoryOpsIncidentPort;
};

function actorId(context: CurrentBusinessContext): string | null {
  return context.platformUserId || null;
}

export class StockReservationService {
  constructor(private readonly deps: StockReservationServiceDependencies) {}

  async listAvailability(context: CurrentBusinessContext): Promise<InventoryAvailabilityView[]> {
    const businessId = context.businessId;
    const balances = await this.deps.balances.listByBusiness(businessId);
    const views: InventoryAvailabilityView[] = [];
    for (const balance of balances) {
      const item = await this.deps.stockItems.findById(businessId, balance.stockItemId);
      const location = await this.deps.locations.findById(businessId, balance.locationId);
      const unit = item ? await this.deps.units.findById(businessId, item.baseUomId) : null;
      views.push({
        stockItemId: balance.stockItemId,
        sku: item?.sku ?? "",
        locationId: balance.locationId,
        locationName: location?.name ?? "",
        onHand: balance.onHand,
        reserved: balance.reserved,
        available: balance.available,
        uomCode: unit?.code ?? "",
        availabilityLabel:
          Number(balance.available) <= 0
            ? "Out of stock"
            : Number(balance.reserved) > 0
              ? "Reserved"
              : "Available",
      });
    }
    return views;
  }

  async listReservations(context: CurrentBusinessContext) {
    const rows = await this.deps.reservations.listByBusiness(context.businessId);
    const views: InventoryReservationView[] = [];
    for (const row of rows) {
      views.push(await this.toView(context.businessId, row.id));
    }
    return views;
  }

  async getReservation(context: CurrentBusinessContext, reservationId: string) {
    return this.toView(context.businessId, reservationId);
  }

  async createReservation(context: CurrentBusinessContext, command: CreateReservationCommand) {
    const businessId = context.businessId;
    const stockItem = await this.requireInboundStockItem(
      businessId,
      command.stockItemId,
      command.locationId
    );
    const location = await this.requireActiveLocation(businessId, command.locationId);
    const idempotencyKey =
      normalizeOptionalText(command.idempotencyKey) ??
      (command.salesOrderLineId
        ? `${INVENTORY_IDEMPOTENCY_OPERATIONS.CREATE_RESERVATION}:${command.salesOrderLineId}`
        : null);
    const uomId = reservationUomId(stockItem, command.uomId);
    await this.requireUnit(businessId, uomId);
    const converted = resolveInboundBaseQuantity({
      enteredQuantity: command.quantity,
      enteredUomId: uomId,
      stockItem,
    });
    const lockKey = `${businessId}:availability:${stockItem.id}:${location.id}`;
    return this.deps.locks.runExclusive(lockKey, async () => {
      await this.expireIfNeeded(businessId, stockItem.id, location.id, actorId(context));
      if (idempotencyKey) {
        const existing = await this.deps.reservations.findByIdempotencyKey(
          businessId,
          idempotencyKey
        );
        if (existing) {
          return this.toView(businessId, existing.id);
        }
      }
      if (command.salesOrderLineId) {
        const duplicate = await this.deps.reservations.findActiveBySaleLine(
          businessId,
          command.salesOrderLineId
        );
        if (duplicate) {
          throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_RESERVATION, undefined, 409);
        }
      }
      const control = await this.requireControl(
        businessId,
        INVENTORY_OPERATION_CODES.STOCK_RESERVATION
      );
      const decision = await this.deps.workflow.evaluateOperationApproval({
        businessId,
        operationCode: control.code,
      });
      const balance = await this.deps.balances.findByItemAndLocation(
        businessId,
        stockItem.id,
        location.id
      );
      const available = balance?.available ?? "0";
      let reservedBase: string;
      try {
        reservedBase = assertSufficientAvailable({
          requestedBase: converted.baseQuantity,
          available,
          policy: control.overReceiptPolicy,
        });
      } catch (error) {
        if (
          error instanceof InventoryError &&
          (error.code === INVENTORY_ERROR_CODES.INSUFFICIENT_AVAILABLE_STOCK ||
            error.code === INVENTORY_ERROR_CODES.NEGATIVE_STOCK_NOT_ALLOWED)
        ) {
          await recordDetectedOpsIncident(this.deps.opsIncidents, context, {
            incidentType:
              error.code === INVENTORY_ERROR_CODES.NEGATIVE_STOCK_NOT_ALLOWED
                ? INVENTORY_OPS_INCIDENT_TYPES.STOCK_NEGATIVE_ATTEMPT
                : INVENTORY_OPS_INCIDENT_TYPES.RESERVATION_CONFLICT,
            severity: "HIGH",
            sourceType: "RESERVATION",
            sourceId: command.salesOrderLineId ?? stockItem.id,
            stockItemId: stockItem.id,
            locationId: location.id,
            description: "Stock could not be reserved for the requested quantity.",
            idempotencyKey: `reservation-conflict:${command.salesOrderLineId ?? stockItem.id}`,
          });
        }
        throw error;
      }
      const remaining = remainingReservedQuantity(reservedBase, "0");
      const allocated = await this.deps.numbering.allocate({
        businessId,
        documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.STOCK_RESERVATION,
      });
      const executeNow = !decision.required;
      if (executeNow) {
        await this.deps.balances.applyReservationHold(
          businessId,
          stockItem.id,
          location.id,
          reservedBase,
          actorId(context)
        );
      }
      const header = await this.deps.reservations.insert({
        businessId,
        documentNumber: allocated.number,
        status: executeNow
          ? INVENTORY_RESERVATION_STATUSES.RESERVED
          : INVENTORY_RESERVATION_STATUSES.REQUESTED,
        stockItemId: stockItem.id,
        locationId: location.id,
        salesOrderId: normalizeOptionalText(command.salesOrderId),
        salesOrderLineId: normalizeOptionalText(command.salesOrderLineId),
        salesOrderNumber: normalizeOptionalText(command.salesOrderNumber),
        requestedQuantity: converted.enteredQuantity,
        uomId: converted.enteredUomId,
        baseQuantity: reservedBase,
        conversionFactor: converted.conversionFactor,
        reservedQuantity: executeNow ? reservedBase : "0",
        fulfilledQuantity: "0",
        remainingQuantity: remaining,
        expiresAt: command.expiresAt ? new Date(command.expiresAt) : null,
        idempotencyKey,
        submittedAt: executeNow ? null : new Date(),
        submittedBy: executeNow ? null : actorId(context),
        approvedAt: null,
        approvedBy: null,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
        releasedAt: null,
        releasedBy: null,
        notes: normalizeOptionalText(command.notes),
        metadata: null,
        createdBy: actorId(context),
        updatedBy: actorId(context),
      });
      if (idempotencyKey) {
        await this.deps.idempotency.insert({
          businessId,
          idempotencyKey,
          operationType: INVENTORY_IDEMPOTENCY_OPERATIONS.CREATE_RESERVATION,
          resourceType: "inventory_reservation",
          resourceId: header.id,
          createdBy: actorId(context),
        });
      }
      requireModePort(trackingModeOf(stockItem), this.deps.traceability);
      if (executeNow) {
        await this.deps.traceability?.reserveUnits({
          context,
          stockItem,
          locationId: location.id,
          sourceType: "STOCK_RESERVATION",
          sourceId: header.id,
          sourceLineId: header.id,
          capture: captureFromCommand(command),
          baseQuantity: reservedBase,
        });
      } else {
        await this.deps.traceability?.captureLine(context, {
          sourceType: "STOCK_RESERVATION",
          sourceId: header.id,
          sourceLineId: header.id,
          stockItem,
          capture: captureFromCommand(command),
          baseQuantity: reservedBase,
          direction: "RESERVE",
        });
      }
      await this.audit(
        context,
        header.id,
        executeNow
          ? INVENTORY_AUDIT_ACTIONS.STOCK_RESERVED
          : INVENTORY_AUDIT_ACTIONS.STOCK_RESERVATION_REQUESTED,
        {
          documentNumber: header.documentNumber,
          stockItemId: stockItem.id,
          locationId: location.id,
          quantity: converted.enteredQuantity,
          baseQuantity: reservedBase,
          salesOrderId: header.salesOrderId,
          salesOrderLineId: header.salesOrderLineId,
        }
      );
      return this.toView(businessId, header.id);
    });
  }

  async approveReservation(context: CurrentBusinessContext, reservationId: string) {
    const businessId = context.businessId;
    const header = await this.requireReservation(businessId, reservationId);
    if (header.status !== INVENTORY_RESERVATION_STATUSES.REQUESTED) {
      throw new InventoryError(INVENTORY_ERROR_CODES.RESERVATION_NOT_FULFILLABLE);
    }
    this.assertChecker(header.submittedBy, actorId(context));
    const lockKey = `${businessId}:availability:${header.stockItemId}:${header.locationId}`;
    return this.deps.locks.runExclusive(lockKey, async () => {
      await this.expireIfNeeded(
        businessId,
        header.stockItemId,
        header.locationId,
        actorId(context)
      );
      const control = await this.requireControl(
        businessId,
        INVENTORY_OPERATION_CODES.STOCK_RESERVATION
      );
      const balance = await this.deps.balances.findByItemAndLocation(
        businessId,
        header.stockItemId,
        header.locationId
      );
      try {
        assertSufficientAvailable({
          requestedBase: header.baseQuantity,
          available: balance?.available ?? "0",
          policy: control.overReceiptPolicy,
        });
      } catch (error) {
        if (
          error instanceof InventoryError &&
          error.code === INVENTORY_ERROR_CODES.INSUFFICIENT_AVAILABLE_STOCK
        ) {
          await recordDetectedOpsIncident(this.deps.opsIncidents, context, {
            incidentType: INVENTORY_OPS_INCIDENT_TYPES.RESERVATION_CONFLICT,
            severity: "HIGH",
            sourceType: "RESERVATION",
            sourceId: header.id,
            stockItemId: header.stockItemId,
            locationId: header.locationId,
            description: "Stock could not be reserved for the requested quantity.",
            idempotencyKey: `reservation-conflict:${header.id}`,
          });
        }
        throw error;
      }
      await this.deps.balances.applyReservationHold(
        businessId,
        header.stockItemId,
        header.locationId,
        header.baseQuantity,
        actorId(context)
      );
      await this.deps.reservations.update(businessId, header.id, {
        status: INVENTORY_RESERVATION_STATUSES.RESERVED,
        reservedQuantity: header.baseQuantity,
        remainingQuantity: header.baseQuantity,
        approvedAt: new Date(),
        approvedBy: actorId(context),
        updatedBy: actorId(context),
        version: header.version + 1,
      });
      const stockItem = await this.requireInboundStockItem(
        businessId,
        header.stockItemId,
        header.locationId
      );
      requireModePort(trackingModeOf(stockItem), this.deps.traceability);
      await this.deps.traceability?.reserveUnits({
        context,
        stockItem,
        locationId: header.locationId,
        sourceType: "STOCK_RESERVATION",
        sourceId: header.id,
        sourceLineId: header.id,
        capture: null,
        baseQuantity: header.baseQuantity,
      });
      await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.STOCK_RESERVATION_APPROVED, {
        documentNumber: header.documentNumber,
      });
      await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.STOCK_RESERVED, {
        documentNumber: header.documentNumber,
        baseQuantity: header.baseQuantity,
      });
      return this.toView(businessId, header.id);
    });
  }

  async rejectReservation(context: CurrentBusinessContext, reservationId: string, reason: string) {
    const businessId = context.businessId;
    const header = await this.requireReservation(businessId, reservationId);
    if (header.status !== INVENTORY_RESERVATION_STATUSES.REQUESTED) {
      throw new InventoryError(INVENTORY_ERROR_CODES.RESERVATION_NOT_FULFILLABLE);
    }
    this.assertChecker(header.submittedBy, actorId(context));
    const rejectionReason = normalizeOptionalText(reason);
    if (!rejectionReason) {
      throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "reason",
      });
    }
    await this.deps.reservations.update(businessId, header.id, {
      status: INVENTORY_RESERVATION_STATUSES.REJECTED,
      rejectedAt: new Date(),
      rejectedBy: actorId(context),
      rejectionReason,
      remainingQuantity: "0",
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(
      context,
      header.id,
      INVENTORY_AUDIT_ACTIONS.STOCK_RESERVATION_REJECTED,
      { documentNumber: header.documentNumber },
      rejectionReason
    );
    return this.toView(businessId, header.id);
  }

  async releaseReservation(context: CurrentBusinessContext, reservationId: string) {
    const businessId = context.businessId;
    const header = await this.requireReservation(businessId, reservationId);
    const control = await this.requireControl(
      businessId,
      INVENTORY_OPERATION_CODES.STOCK_RESERVATION_RELEASE
    );
    const decision = await this.deps.workflow.evaluateOperationApproval({
      businessId,
      operationCode: control.code,
    });
    if (decision.required) {
      this.assertChecker(header.createdBy, actorId(context));
    }
    if (!isReleasableStatus(header.status)) {
      throw new InventoryError(INVENTORY_ERROR_CODES.RESERVATION_NOT_RELEASABLE);
    }
    const lockKey = `${businessId}:availability:${header.stockItemId}:${header.locationId}`;
    return this.deps.locks.runExclusive(lockKey, async () => {
      const current = await this.requireReservation(businessId, reservationId);
      const releaseQty = remainingReservedQuantity(
        current.reservedQuantity,
        "0"
      );
      if (releaseQty !== "0") {
        await this.deps.balances.applyReservationHold(
          businessId,
          current.stockItemId,
          current.locationId,
          `-${releaseQty}`,
          actorId(context)
        );
      }
      await this.deps.reservations.update(businessId, current.id, {
        status: INVENTORY_RESERVATION_STATUSES.RELEASED,
        reservedQuantity: "0",
        remainingQuantity: "0",
        releasedAt: new Date(),
        releasedBy: actorId(context),
        updatedBy: actorId(context),
        version: current.version + 1,
      });
      const stockItem = await this.deps.stockItems.findById(businessId, current.stockItemId);
      if (stockItem) {
        await this.deps.traceability?.releaseUnits({
          context,
          stockItem,
          sourceId: current.id,
        });
      }
      await this.audit(context, current.id, INVENTORY_AUDIT_ACTIONS.STOCK_RESERVATION_RELEASED, {
        documentNumber: current.documentNumber,
        salesOrderId: current.salesOrderId,
        baseQuantity: releaseQty,
      });
      return this.toView(businessId, current.id);
    });
  }

  async fulfilReservation(
    context: CurrentBusinessContext,
    reservationId: string,
    command: FulfilReservationCommand
  ) {
    const businessId = context.businessId;
    const header = await this.requireReservation(businessId, reservationId);
    const fulfilmentReference = command.fulfilmentReference.trim();
    if (!fulfilmentReference) {
      throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "fulfilmentReference",
      });
    }
    const idempotencyKey =
      normalizeOptionalText(command.idempotencyKey) ??
      `${INVENTORY_IDEMPOTENCY_OPERATIONS.FULFIL_RESERVATION}:${header.id}:${fulfilmentReference}`;
    const lockKey = `${businessId}:availability:${header.stockItemId}:${header.locationId}`;
    return this.deps.locks.runExclusive(lockKey, async () => {
      const current = await this.requireReservation(businessId, reservationId);
      const existingFulfilment = await this.deps.fulfilments.findByIdempotencyKey(
        businessId,
        idempotencyKey
      );
      if (existingFulfilment) {
        await this.audit(context, current.id, INVENTORY_AUDIT_ACTIONS.STOCK_DEDUCTION_IDEMPOTENT, {
          fulfilmentReference,
          reservationId: current.id,
        });
        return this.toView(businessId, current.id);
      }
      const control = await this.requireControl(
        businessId,
        INVENTORY_OPERATION_CODES.STOCK_DEDUCTION
      );
      const decision = await this.deps.workflow.evaluateOperationApproval({
        businessId,
        operationCode: control.code,
      });
      if (decision.required) {
        this.assertChecker(current.createdBy ?? current.submittedBy, actorId(context));
      }
      if (!isFulfillableStatus(current.status)) {
        throw new InventoryError(INVENTORY_ERROR_CODES.RESERVATION_NOT_FULFILLABLE);
      }
      const stockItem = await this.requireInboundStockItem(
        businessId,
        current.stockItemId,
        current.locationId
      );
      const uomId = command.uomId?.trim() || current.uomId;
      const converted = resolveInboundBaseQuantity({
        enteredQuantity: command.quantity,
        enteredUomId: uomId,
        stockItem,
      });
      const remaining = remainingReservedQuantity(current.remainingQuantity, "0");
      assertDeductionWithinReservation({
        requestedBase: converted.baseQuantity,
        remainingReserved: remaining,
      });
      const balance = await this.deps.balances.findByItemAndLocation(
        businessId,
        current.stockItemId,
        current.locationId
      );
      assertOnHandCoversDeduction({
        onHand: balance?.onHand ?? "0",
        deductedBase: converted.baseQuantity,
        policy: control.overReceiptPolicy,
      });
      await this.audit(context, current.id, INVENTORY_AUDIT_ACTIONS.STOCK_DEDUCTION_REQUESTED, {
        documentNumber: current.documentNumber,
        fulfilmentReference,
        baseQuantity: converted.baseQuantity,
      });
      const fulfilmentId = randomUUID();
      const location = await this.requireActiveLocation(businessId, current.locationId);
      const movement = await postSaleDeductionToLedger({
        businessId,
        actorId: actorId(context),
        stockItem,
        location,
        ledgerQuantity: converted.baseQuantity,
        ledgerUomId: converted.baseUomId,
        sourceType: "SALES_ORDER",
        sourceId: current.salesOrderId ?? current.id,
        reservationId: current.id,
        fulfilmentId,
        salesOrderId: current.salesOrderId,
        salesOrderLineId: current.salesOrderLineId,
        reason: current.salesOrderNumber,
        movements: this.deps.movements,
        balances: this.deps.balances,
      });
      requireModePort(trackingModeOf(stockItem), this.deps.traceability);
      await this.deps.traceability?.applyOutbound({
        context,
        stockItem,
        locationId: location.id,
        movementId: movement.id,
        sourceType: "SALES_ORDER",
        sourceId: current.salesOrderId ?? current.id,
        sourceLineId: fulfilmentId,
        baseQuantity: converted.baseQuantity,
        capture: captureFromCommand(command),
        reservationId: current.id,
        unitStatus: "SOLD",
        enforceExpiry: true,
      });
      await this.deps.fulfilments.insert({
        id: fulfilmentId,
        businessId,
        reservationId: current.id,
        fulfilmentReference,
        quantity: converted.enteredQuantity,
        baseQuantity: converted.baseQuantity,
        uomId: converted.enteredUomId,
        movementId: movement.id,
        idempotencyKey,
        notes: normalizeOptionalText(command.notes),
        createdBy: actorId(context),
      });
      const nextFulfilled = applyInboundQuantity(current.fulfilledQuantity, converted.baseQuantity);
      const nextReserved = remainingReservedQuantity(current.reservedQuantity, converted.baseQuantity);
      const nextRemaining = remainingReservedQuantity(current.baseQuantity, nextFulfilled);
      const nextStatus = nextReservationStatus({
        current: current.status,
        baseQuantity: current.baseQuantity,
        fulfilledQuantity: nextFulfilled,
      });
      await this.deps.reservations.update(businessId, current.id, {
        status: nextStatus,
        reservedQuantity: nextReserved,
        fulfilledQuantity: nextFulfilled,
        remainingQuantity: nextRemaining,
        updatedBy: actorId(context),
        version: current.version + 1,
      });
      await this.deps.idempotency.insert({
        businessId,
        idempotencyKey,
        operationType: INVENTORY_IDEMPOTENCY_OPERATIONS.FULFIL_RESERVATION,
        resourceType: "inventory_fulfilment",
        resourceId: fulfilmentId,
        createdBy: actorId(context),
      });
      await this.audit(context, current.id, INVENTORY_AUDIT_ACTIONS.STOCK_DEDUCTED, {
        documentNumber: current.documentNumber,
        movementId: movement.id,
        fulfilmentReference,
        baseQuantity: converted.baseQuantity,
        salesOrderId: current.salesOrderId,
      });
      if (nextStatus === INVENTORY_RESERVATION_STATUSES.PARTIALLY_FULFILLED) {
        await this.audit(
          context,
          current.id,
          INVENTORY_AUDIT_ACTIONS.STOCK_RESERVATION_PARTIALLY_FULFILLED,
          { remainingQuantity: nextRemaining }
        );
      }
      if (nextStatus === INVENTORY_RESERVATION_STATUSES.FULFILLED) {
        await this.audit(context, current.id, INVENTORY_AUDIT_ACTIONS.STOCK_RESERVATION_FULFILLED, {
          fulfilledQuantity: nextFulfilled,
        });
      }
      return this.toView(businessId, current.id);
    });
  }

  async createReservationFromSale(
    context: CurrentBusinessContext,
    orderId: string,
    salesOrderLineId: string,
    locationId: string,
    quantity?: string
  ) {
    const contract = await this.requireSaleContract(context, orderId);
    assertSaleReservable(contract);
    const line = requirePhysicalSaleLine(contract, salesOrderLineId);
    const stockItem = await this.deps.stockItems.findActiveByProduct(
      context.businessId,
      line.offeringId
    );
    if (!stockItem) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCK_ITEM_NOT_FOUND, undefined, 404);
    }
    return this.createReservation(context, {
      stockItemId: stockItem.id,
      locationId,
      quantity: quantity ?? line.outstandingQuantity ?? line.orderedQuantity,
      uomId: line.salesUomId ?? undefined,
      salesOrderId: contract.orderId,
      salesOrderLineId: line.orderLineId,
      salesOrderNumber: contract.orderNumber,
      idempotencyKey: `${INVENTORY_IDEMPOTENCY_OPERATIONS.CREATE_RESERVATION}:${line.orderLineId}`,
    });
  }

  async fulfilReservationFromSale(
    context: CurrentBusinessContext,
    orderId: string,
    salesOrderLineId: string,
    fulfilmentReference: string,
    quantity?: string
  ) {
    const contract = await this.requireSaleContract(context, orderId);
    assertSaleDeductible(contract);
    requirePhysicalSaleLine(contract, salesOrderLineId);
    const reservation = await this.findReservationForSaleLine(
      context.businessId,
      salesOrderLineId
    );
    if (!reservation) {
      throw new InventoryError(INVENTORY_ERROR_CODES.RESERVATION_NOT_FOUND, undefined, 404);
    }
    const line = contract.lines.find((row) => row.orderLineId === salesOrderLineId);
    const explicit = normalizeOptionalText(quantity);
    const stockItem = await this.deps.stockItems.findById(
      context.businessId,
      reservation.stockItemId
    );
    return this.fulfilReservation(context, reservation.id, {
      quantity: resolveSaleFulfilQuantity(quantity, reservation.remainingQuantity),
      fulfilmentReference,
      // Remaining reserved is stored in base UOM. An explicit quantity uses
      // the sale-line UOM; otherwise convert remaining as base, never purchase.
      uomId: explicit
        ? (line?.salesUomId ?? undefined)
        : (stockItem?.baseUomId ?? undefined),
      idempotencyKey: `${INVENTORY_IDEMPOTENCY_OPERATIONS.FULFIL_RESERVATION}:${reservation.id}:${fulfilmentReference}`,
    });
  }

  async releaseReservationsForCancelledSale(context: CurrentBusinessContext, orderId: string) {
    const contract = await this.requireSaleContract(context, orderId);
    assertSaleCancelled(contract);
    const rows = await this.deps.reservations.listByBusiness(context.businessId);
    const views: InventoryReservationView[] = [];
    for (const row of rows) {
      if (row.salesOrderId !== contract.orderId || !isReleasableStatus(row.status)) {
        continue;
      }
      views.push(await this.releaseReservation(context, row.id));
    }
    return views;
  }

  private async findReservationForSaleLine(businessId: string, salesOrderLineId: string) {
    const active = await this.deps.reservations.findActiveBySaleLine(
      businessId,
      salesOrderLineId
    );
    if (active) {
      return active;
    }
    const rows = await this.deps.reservations.listByBusiness(businessId);
    return (
      rows.find((row) => row.salesOrderLineId === salesOrderLineId) ?? null
    );
  }

  private async requireSaleContract(context: CurrentBusinessContext, orderId: string) {
    if (!this.deps.salesFulfilment) {
      throw new InventoryError(INVENTORY_ERROR_CODES.SALE_NOT_FULFILLABLE);
    }
    const contract = await this.deps.salesFulfilment.getByOrderId(context, orderId);
    if (!contract || contract.businessId !== context.businessId) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
    }
    return contract;
  }

  private async expireIfNeeded(
    businessId: string,
    stockItemId: string,
    locationId: string,
    actor: string | null
  ) {
    const active = await this.deps.reservations.listActiveByItemLocation(
      businessId,
      stockItemId,
      locationId
    );
    for (const row of active) {
      if (!isReservationExpired(row.expiresAt)) {
        continue;
      }
      const releaseQty = row.reservedQuantity;
      if (releaseQty !== "0") {
        await this.deps.balances.applyReservationHold(
          businessId,
          row.stockItemId,
          row.locationId,
          `-${releaseQty}`,
          actor
        );
      }
      await this.deps.reservations.update(businessId, row.id, {
        status: INVENTORY_RESERVATION_STATUSES.EXPIRED,
        reservedQuantity: "0",
        remainingQuantity: "0",
        releasedAt: new Date(),
        releasedBy: actor,
        updatedBy: actor,
        version: row.version + 1,
      });
      const stockItem = await this.deps.stockItems.findById(businessId, row.stockItemId);
      if (stockItem) {
        await this.deps.traceability?.releaseUnits({
          context: {
            businessId,
            platformUserId: actor ?? "",
            businessMembershipId: "",
          },
          stockItem,
          sourceId: row.id,
        });
      }
    }
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

  private async requireReservation(businessId: string, reservationId: string) {
    const row = await this.deps.reservations.findById(businessId, reservationId);
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.RESERVATION_NOT_FOUND, undefined, 404);
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

  private async requireInboundStockItem(
    businessId: string,
    stockItemId: string,
    locationId: string
  ) {
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
      entityName: "inventory_reservation",
      entityId,
      action,
      outcome: "SUCCESS",
      reason,
      references,
    });
  }

  private async toView(businessId: string, reservationId: string): Promise<InventoryReservationView> {
    const header = await this.requireReservation(businessId, reservationId);
    const item = await this.deps.stockItems.findById(businessId, header.stockItemId);
    const location = await this.deps.locations.findById(businessId, header.locationId);
    const enteredUnit = await this.deps.units.findById(businessId, header.uomId);
    const baseUnit = item
      ? await this.deps.units.findById(businessId, item.baseUomId)
      : null;
    const balance = await this.deps.balances.findByItemAndLocation(
      businessId,
      header.stockItemId,
      header.locationId
    );
    const fulfilments = await this.deps.fulfilments.listByReservation(businessId, header.id);
    return {
      id: header.id,
      documentNumber: header.documentNumber,
      status: header.status,
      stockItemId: header.stockItemId,
      sku: item?.sku ?? "",
      locationId: header.locationId,
      locationName: location?.name ?? "",
      salesOrderId: header.salesOrderId,
      salesOrderLineId: header.salesOrderLineId,
      salesOrderNumber: header.salesOrderNumber,
      requestedQuantity: header.requestedQuantity,
      reservedQuantity: header.reservedQuantity,
      fulfilledQuantity: header.fulfilledQuantity,
      remainingQuantity: header.remainingQuantity,
      uomCode: enteredUnit?.code ?? "",
      baseQuantity: header.baseQuantity,
      baseUomCode: baseUnit?.code ?? enteredUnit?.code ?? "",
      conversionFactor: header.conversionFactor,
      onHand: balance?.onHand ?? "0",
      available: balance?.available ?? "0",
      expiresAt: header.expiresAt?.toISOString() ?? null,
      createdAt: header.createdAt.toISOString(),
      fulfilments: fulfilments.map((row) => ({
        id: row.id,
        fulfilmentReference: row.fulfilmentReference,
        quantity: row.quantity,
        baseQuantity: row.baseQuantity,
        movementId: row.movementId,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }
}

export function createDefaultStockReservationDependencies(): StockReservationServiceDependencies {
  const controls = createInventoryOperationControlRepository();
  const locks = createInProcessInventoryLock();
  return {
    stockItems: createStockItemRepository(),
    locations: createInventoryLocationRepository(),
    itemLocations: createStockItemLocationRepository(),
    movements: createInventoryMovementRepository(),
    balances: createInventoryBalanceRepository(),
    reservations: createInventoryReservationRepository(),
    fulfilments: createInventoryFulfilmentRepository(),
    controls,
    units: createUnitOfMeasureAdapter(),
    numbering: new ConfigurableDocumentNumberingService(
      createDocumentNumberingPolicyRepository()
    ),
    workflow: createInventoryControlWorkflowAdapter(controls),
    idempotency: createInventoryIdempotencyRepository(),
    locks,
    audit: createInventoryAuditAdapter(),
    salesFulfilment: createSalesFulfilmentContractAdapter(),
    traceability: createTraceabilityService({
      ...createDefaultTraceabilityDependencies(locks),
    }),
    opsIncidents: createInventoryOpsIncidentService(),
  };
}

export function createStockReservationService(deps?: StockReservationServiceDependencies) {
  return new StockReservationService(deps ?? createDefaultStockReservationDependencies());
}
