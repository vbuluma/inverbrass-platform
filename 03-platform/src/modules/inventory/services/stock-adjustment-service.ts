/**
 * Purpose:
 * Stock adjustments, damage, loss, and returns. Posted documents create
 * immutable ledger movements. Reservations are not cancelled from here.
 *
 * Implementation Package:
 * BP-008 / IP-05 – Stock Adjustments, Damage, Loss & Returns
 */

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
  INVENTORY_ADJUSTMENT_TYPE_LABELS,
  INVENTORY_ADJUSTMENT_TYPES,
  INVENTORY_AUDIT_ACTIONS,
  INVENTORY_DOCUMENT_STATUSES,
  INVENTORY_IDEMPOTENCY_OPERATIONS,
  INVENTORY_TRACKED_UNIT_STATUSES,
  STOCK_ITEM_TYPE_CODES,
  type InventoryAdjustmentType,
} from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryAdjustmentLineRepositoryPort,
  InventoryAdjustmentRepositoryPort,
  InventoryAuditPort,
  InventoryBalanceRepositoryPort,
  InventoryIdempotencyPort,
  InventoryLocationRepositoryPort,
  InventoryLockPort,
  InventoryMovementRepositoryPort,
  InventoryOperationControlPort,
  InventoryTraceabilityPort,
  InventoryUnitCataloguePort,
  StockItemLocationRepositoryPort,
  StockItemRepositoryPort,
} from "@/modules/inventory/ports";
import { createInventoryControlWorkflowAdapter } from "@/modules/inventory/adapters/inventory-control-workflow-adapter";
import { createUnitOfMeasureAdapter } from "@/modules/inventory/adapters/unit-of-measure-adapter";
import { createInventoryAdjustmentLineRepository, createInventoryAdjustmentRepository } from "@/modules/inventory/repositories/inventory-adjustment-repository";
import { createInventoryBalanceRepository } from "@/modules/inventory/repositories/inventory-balance-repository";
import { createInventoryIdempotencyRepository } from "@/modules/inventory/repositories/inventory-idempotency-repository";
import { createInventoryLocationRepository } from "@/modules/inventory/repositories/inventory-location-repository";
import { createInventoryMovementRepository } from "@/modules/inventory/repositories/inventory-movement-repository";
import { createInventoryOperationControlRepository } from "@/modules/inventory/repositories/inventory-operation-control-repository";
import { createStockItemLocationRepository } from "@/modules/inventory/repositories/stock-item-location-repository";
import { createStockItemRepository } from "@/modules/inventory/repositories/stock-item-repository";
import { createInventoryAuditAdapter } from "@/modules/inventory/services/inventory-audit-helper";
import { postAdjustmentLineToLedger } from "@/modules/inventory/services/inventory-adjustment-posting";
import {
  assertAdjustmentReason,
  assertAdjustmentType,
  assertReturnCondition,
  assertReturnWithinReturnable,
  assertSufficientAvailableForDecrease,
  createIdempotencyKey,
  isInboundAdjustmentType,
  operationCodeForAdjustmentType,
  originIdFromMetadata,
  remainingReturnableQuantity,
} from "@/modules/inventory/services/inventory-adjustment-rules";
import {
  assertCanCancel,
  assertCanPost,
  assertDraftEditable,
  resolveInboundBaseQuantity,
} from "@/modules/inventory/services/inventory-inbound-rules";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import { normalizeOptionalText } from "@/modules/inventory/services/stock-item-rules";
import {
  captureFromCommand,
  createDefaultTraceabilityDependencies,
  createTraceabilityService,
  requireModePort,
} from "@/modules/inventory/services/inventory-traceability-service";
import { trackingModeOf } from "@/modules/inventory/services/inventory-traceability-rules";
import { ConfigurableDocumentNumberingService } from "@/core/localization-regulatory/services/document-numbering-service";
import { createDocumentNumberingPolicyRepository } from "@/core/localization-regulatory/repositories/document-numbering-policy-repository";
import type {
  AddAdjustmentLineCommand,
  CreateAdjustmentCommand,
  InventoryAdjustmentLineView,
  InventoryAdjustmentView,
} from "@/modules/inventory/types";

export type StockAdjustmentServiceDependencies = {
  stockItems: StockItemRepositoryPort;
  locations: InventoryLocationRepositoryPort;
  itemLocations: StockItemLocationRepositoryPort;
  movements: InventoryMovementRepositoryPort;
  balances: InventoryBalanceRepositoryPort;
  adjustments: InventoryAdjustmentRepositoryPort;
  adjustmentLines: InventoryAdjustmentLineRepositoryPort;
  controls: InventoryOperationControlPort;
  units: InventoryUnitCataloguePort;
  numbering: DocumentNumberingPort;
  workflow: WorkflowEnginePort;
  idempotency: InventoryIdempotencyPort;
  locks: InventoryLockPort;
  audit: InventoryAuditPort;
  traceability?: InventoryTraceabilityPort | null;
};

function actorId(context: CurrentBusinessContext): string | null {
  return context.platformUserId || null;
}

export class StockAdjustmentService {
  constructor(private readonly deps: StockAdjustmentServiceDependencies) {}

  async listAdjustments(context: CurrentBusinessContext) {
    const rows = await this.deps.adjustments.listByBusiness(context.businessId);
    const views: InventoryAdjustmentView[] = [];
    for (const row of rows) {
      views.push(await this.toView(context.businessId, row.id));
    }
    return views;
  }

  async getAdjustment(context: CurrentBusinessContext, adjustmentId: string) {
    return this.toView(context.businessId, adjustmentId);
  }

  async createAdjustment(context: CurrentBusinessContext, command: CreateAdjustmentCommand) {
    const businessId = context.businessId;
    const adjustmentType = assertAdjustmentType(command.adjustmentType);
    const reason = assertAdjustmentReason(command.reason, command.notes);
    const idempotencyKey = createIdempotencyKey({
      adjustmentType,
      externalReference: command.externalReference,
      idempotencyKey: command.idempotencyKey,
    });
    if (idempotencyKey) {
      const existing = await this.deps.adjustments.findByIdempotencyKey(businessId, idempotencyKey);
      if (existing) {
        return this.toView(businessId, existing.id);
      }
    }
    const location = await this.requireActiveLocation(businessId, command.locationId);
    const stockItem = await this.requireInboundStockItem(
      businessId,
      command.stockItemId,
      location.id
    );
    const uomId = command.uomId?.trim() || stockItem.baseUomId;
    await this.requireUnit(businessId, uomId);
    const converted = resolveInboundBaseQuantity({
      enteredQuantity: command.quantity,
      enteredUomId: uomId,
      stockItem,
    });
    const allocated = await this.deps.numbering.allocate({
      businessId,
      documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.STOCK_ADJUSTMENT,
    });
    const header = await this.deps.adjustments.insert({
      businessId,
      documentNumber: allocated.number,
      status: INVENTORY_DOCUMENT_STATUSES.DRAFT,
      adjustmentType,
      locationId: location.id,
      reason,
      notes: normalizeOptionalText(command.notes),
      externalReference: normalizeOptionalText(command.externalReference),
      originType: normalizeOptionalText(command.originType),
      originId: normalizeOptionalText(command.originId),
      originLineId: normalizeOptionalText(command.originLineId),
      idempotencyKey,
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
    const line = await this.deps.adjustmentLines.insert({
      businessId,
      headerId: header.id,
      lineNumber: 1,
      stockItemId: stockItem.id,
      quantity: converted.enteredQuantity,
      uomId: converted.enteredUomId,
      baseQuantity: converted.baseQuantity,
      conversionFactor: converted.conversionFactor,
      condition: assertReturnCondition(command.condition),
      onHandBefore: null,
      onHandAfter: null,
      movementId: null,
      notes: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    requireModePort(trackingModeOf(stockItem), this.deps.traceability);
    await this.deps.traceability?.captureLine(context, {
      sourceType: "STOCK_ADJUSTMENT",
      sourceId: header.id,
      sourceLineId: line.id,
      stockItem,
      capture: captureFromCommand(command),
      baseQuantity: converted.baseQuantity,
      direction: isInboundAdjustmentType(adjustmentType) ? "IN" : "OUT",
    });
    if (idempotencyKey) {
      await this.deps.idempotency.insert({
        businessId,
        idempotencyKey,
        operationType:
          adjustmentType === INVENTORY_ADJUSTMENT_TYPES.CUSTOMER_RETURN
            ? INVENTORY_IDEMPOTENCY_OPERATIONS.CREATE_CUSTOMER_RETURN
            : INVENTORY_IDEMPOTENCY_OPERATIONS.CREATE_STOCK_ADJUSTMENT,
        resourceType: "inventory_adjustment",
        resourceId: header.id,
        createdBy: actorId(context),
      });
    }
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.ADJUSTMENT_CREATED, {
      documentNumber: header.documentNumber,
      adjustmentType,
      locationId: location.id,
      stockItemId: stockItem.id,
      quantity: converted.enteredQuantity,
      baseQuantity: converted.baseQuantity,
      reason,
    });
    return this.toView(businessId, header.id);
  }

  async addAdjustmentLine(
    context: CurrentBusinessContext,
    adjustmentId: string,
    command: AddAdjustmentLineCommand
  ) {
    const businessId = context.businessId;
    const header = await this.requireAdjustment(businessId, adjustmentId);
    assertDraftEditable(header.status);
    const stockItem = await this.requireInboundStockItem(
      businessId,
      command.stockItemId,
      header.locationId
    );
    const uomId = command.uomId?.trim() || stockItem.baseUomId;
    await this.requireUnit(businessId, uomId);
    const converted = resolveInboundBaseQuantity({
      enteredQuantity: command.quantity,
      enteredUomId: uomId,
      stockItem,
    });
    const existing = await this.deps.adjustmentLines.listByHeader(businessId, header.id);
    await this.deps.adjustmentLines.insert({
      businessId,
      headerId: header.id,
      lineNumber: existing.length + 1,
      stockItemId: stockItem.id,
      quantity: converted.enteredQuantity,
      uomId: converted.enteredUomId,
      baseQuantity: converted.baseQuantity,
      conversionFactor: converted.conversionFactor,
      condition: assertReturnCondition(command.condition),
      onHandBefore: null,
      onHandAfter: null,
      movementId: null,
      notes: normalizeOptionalText(command.notes),
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    return this.toView(businessId, header.id);
  }

  async submitAdjustment(context: CurrentBusinessContext, adjustmentId: string) {
    const businessId = context.businessId;
    const header = await this.requireAdjustment(businessId, adjustmentId);
    assertDraftEditable(header.status);
    const lines = await this.deps.adjustmentLines.listByHeader(businessId, header.id);
    if (lines.length === 0) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LINE_REQUIRED);
    }
    await this.deps.adjustments.update(businessId, header.id, {
      status: INVENTORY_DOCUMENT_STATUSES.SUBMITTED,
      submittedAt: new Date(),
      submittedBy: actorId(context),
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    const control = await this.requireControl(
      businessId,
      operationCodeForAdjustmentType(header.adjustmentType)
    );
    const decision = await this.deps.workflow.evaluateOperationApproval({
      businessId,
      operationCode: control.code,
    });
    await this.audit(
      context,
      header.id,
      decision.required
        ? INVENTORY_AUDIT_ACTIONS.ADJUSTMENT_APPROVAL_REQUESTED
        : INVENTORY_AUDIT_ACTIONS.ADJUSTMENT_SUBMITTED,
      { documentNumber: header.documentNumber }
    );
    return this.toView(businessId, header.id);
  }

  async approveAdjustment(context: CurrentBusinessContext, adjustmentId: string) {
    const businessId = context.businessId;
    const header = await this.requireAdjustment(businessId, adjustmentId);
    if (header.status !== INVENTORY_DOCUMENT_STATUSES.SUBMITTED) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_POSTABLE);
    }
    this.assertChecker(header.submittedBy, actorId(context));
    await this.deps.adjustments.update(businessId, header.id, {
      status: INVENTORY_DOCUMENT_STATUSES.APPROVED,
      approvedAt: new Date(),
      approvedBy: actorId(context),
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.ADJUSTMENT_APPROVED, {
      documentNumber: header.documentNumber,
    });
    return this.toView(businessId, header.id);
  }

  async rejectAdjustment(context: CurrentBusinessContext, adjustmentId: string, reason: string) {
    const businessId = context.businessId;
    const header = await this.requireAdjustment(businessId, adjustmentId);
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
    await this.deps.adjustments.update(businessId, header.id, {
      status: INVENTORY_DOCUMENT_STATUSES.REJECTED,
      rejectedAt: new Date(),
      rejectedBy: actorId(context),
      rejectionReason,
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(
      context,
      header.id,
      INVENTORY_AUDIT_ACTIONS.ADJUSTMENT_REJECTED,
      { documentNumber: header.documentNumber },
      rejectionReason
    );
    return this.toView(businessId, header.id);
  }

  async cancelAdjustment(context: CurrentBusinessContext, adjustmentId: string) {
    const businessId = context.businessId;
    const header = await this.requireAdjustment(businessId, adjustmentId);
    assertCanCancel(header.status);
    await this.deps.adjustments.update(businessId, header.id, {
      status: INVENTORY_DOCUMENT_STATUSES.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: actorId(context),
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.ADJUSTMENT_CANCELLED, {
      documentNumber: header.documentNumber,
    });
    return this.toView(businessId, header.id);
  }

  async postAdjustment(context: CurrentBusinessContext, adjustmentId: string) {
    const businessId = context.businessId;
    const header = await this.requireAdjustment(businessId, adjustmentId);
    const control = await this.requireControl(
      businessId,
      operationCodeForAdjustmentType(header.adjustmentType)
    );
    const decision = await this.deps.workflow.evaluateOperationApproval({
      businessId,
      operationCode: control.code,
    });
    if (header.status === INVENTORY_DOCUMENT_STATUSES.POSTED) {
      return this.toView(businessId, header.id);
    }
    assertCanPost(header.status, decision.required);
    const lines = await this.deps.adjustmentLines.listByHeader(businessId, header.id);
    if (lines.length === 0) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LINE_REQUIRED);
    }
    const location = await this.requireActiveLocation(businessId, header.locationId);
    const lockKeys = [
      ...new Set(lines.map((line) => `${businessId}:availability:${line.stockItemId}:${header.locationId}`)),
    ].sort();
    return this.runLocks(lockKeys, async () => {
      const current = await this.requireAdjustment(businessId, adjustmentId);
      if (current.status === INVENTORY_DOCUMENT_STATUSES.POSTED) {
        return this.toView(businessId, current.id);
      }
      const postKey = `${INVENTORY_IDEMPOTENCY_OPERATIONS.POST_ADJUSTMENT}:${current.id}`;
      const existingKey = await this.deps.idempotency.find(
        businessId,
        INVENTORY_IDEMPOTENCY_OPERATIONS.POST_ADJUSTMENT,
        postKey
      );
      if (existingKey) {
        return this.toView(businessId, current.id);
      }
      for (const line of lines) {
        const stockItem = await this.requireInboundStockItem(
          businessId,
          line.stockItemId,
          location.id
        );
        const converted = resolveInboundBaseQuantity({
          enteredQuantity: line.quantity,
          enteredUomId: line.uomId,
          stockItem,
        });
        await this.assertReturnableIfNeeded(
          businessId,
          current,
          stockItem.id,
          converted.baseQuantity
        );
        const balance = await this.deps.balances.findByItemAndLocation(
          businessId,
          stockItem.id,
          location.id
        );
        if (!isInboundAdjustmentType(current.adjustmentType)) {
          assertSufficientAvailableForDecrease({
            requestedBase: converted.baseQuantity,
            available: balance?.available ?? "0",
            onHand: balance?.onHand ?? "0",
            policy: control.overReceiptPolicy,
          });
        }
        const onHandBefore = balance?.onHand ?? "0";
        const movement = await postAdjustmentLineToLedger({
          businessId,
          actorId: actorId(context),
          movementType: current.adjustmentType,
          stockItem,
          location,
          line,
          ledgerQuantity: converted.baseQuantity,
          ledgerUomId: converted.baseUomId,
          conversionFactor: converted.conversionFactor,
          sourceType: "STOCK_ADJUSTMENT",
          sourceId: current.id,
          originType: current.originType,
          originId: current.originId,
          originLineId: current.originLineId,
          reason: current.reason,
          movements: this.deps.movements,
          balances: this.deps.balances,
        });
        requireModePort(trackingModeOf(stockItem), this.deps.traceability);
        const inbound = isInboundAdjustmentType(current.adjustmentType);
        const applyInput = {
          context,
          stockItem,
          locationId: location.id,
          movementId: movement.id,
          sourceType: "STOCK_ADJUSTMENT",
          sourceId: current.id,
          sourceLineId: line.id,
          baseQuantity: converted.baseQuantity,
          enforceExpiry: false,
          unitStatus: inbound
            ? INVENTORY_TRACKED_UNIT_STATUSES.AVAILABLE
            : current.adjustmentType === INVENTORY_ADJUSTMENT_TYPES.DAMAGE
              ? INVENTORY_TRACKED_UNIT_STATUSES.DAMAGED
              : current.adjustmentType === INVENTORY_ADJUSTMENT_TYPES.LOSS
                ? INVENTORY_TRACKED_UNIT_STATUSES.LOST
                : current.adjustmentType === INVENTORY_ADJUSTMENT_TYPES.SUPPLIER_RETURN
                  ? INVENTORY_TRACKED_UNIT_STATUSES.RETURNED
                  : INVENTORY_TRACKED_UNIT_STATUSES.LOST,
        };
        if (inbound) {
          await this.deps.traceability?.applyInbound(applyInput);
        } else {
          await this.deps.traceability?.applyOutbound(applyInput);
        }
        const after = await this.deps.balances.findByItemAndLocation(
          businessId,
          stockItem.id,
          location.id
        );
        await this.deps.adjustmentLines.update(businessId, line.id, {
          baseQuantity: converted.baseQuantity,
          conversionFactor: converted.conversionFactor,
          onHandBefore,
          onHandAfter: after?.onHand ?? onHandBefore,
          movementId: movement.id,
          updatedBy: actorId(context),
        });
      }
      await this.deps.idempotency.insert({
        businessId,
        idempotencyKey: postKey,
        operationType: INVENTORY_IDEMPOTENCY_OPERATIONS.POST_ADJUSTMENT,
        resourceType: "inventory_adjustment",
        resourceId: current.id,
        createdBy: actorId(context),
      });
      await this.deps.adjustments.update(businessId, current.id, {
        status: INVENTORY_DOCUMENT_STATUSES.POSTED,
        postedAt: new Date(),
        postedBy: actorId(context),
        updatedBy: actorId(context),
        version: current.version + 1,
      });
      await this.auditPosted(context, current.id, current.adjustmentType, current.documentNumber);
      return this.toView(businessId, current.id);
    });
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

  private async assertReturnableIfNeeded(
    businessId: string,
    header: { adjustmentType: string; originId: string | null },
    stockItemId: string,
    requestedBase: string
  ) {
    if (!header.originId) {
      return;
    }
    if (
      header.adjustmentType !== INVENTORY_ADJUSTMENT_TYPES.CUSTOMER_RETURN &&
      header.adjustmentType !== INVENTORY_ADJUSTMENT_TYPES.SUPPLIER_RETURN
    ) {
      return;
    }
    const originMovementType =
      header.adjustmentType === INVENTORY_ADJUSTMENT_TYPES.CUSTOMER_RETURN
        ? "SALE_DEDUCTION"
        : "RECEIPT";
    const movements = await this.deps.movements.listByStockItem(businessId, stockItemId);
    let originQuantity = "0";
    let alreadyReturned = "0";
    for (const movement of movements) {
      const origin = originIdFromMetadata(movement.metadata);
      if (origin !== header.originId) {
        continue;
      }
      if (movement.movementType === originMovementType) {
        originQuantity = applyInboundQuantity(originQuantity, movement.quantity);
      }
      if (movement.movementType === header.adjustmentType) {
        alreadyReturned = applyInboundQuantity(alreadyReturned, movement.quantity);
      }
    }
    assertReturnWithinReturnable({
      requestedBase,
      remainingReturnable: remainingReturnableQuantity(originQuantity, alreadyReturned),
    });
  }

  private async auditPosted(
    context: CurrentBusinessContext,
    entityId: string,
    adjustmentType: string,
    documentNumber: string
  ) {
    await this.audit(context, entityId, INVENTORY_AUDIT_ACTIONS.ADJUSTMENT_POSTED, {
      documentNumber,
      adjustmentType,
    });
    if (adjustmentType === INVENTORY_ADJUSTMENT_TYPES.DAMAGE) {
      await this.audit(context, entityId, INVENTORY_AUDIT_ACTIONS.DAMAGE_RECORDED, { documentNumber });
    }
    if (adjustmentType === INVENTORY_ADJUSTMENT_TYPES.LOSS) {
      await this.audit(context, entityId, INVENTORY_AUDIT_ACTIONS.LOSS_RECORDED, { documentNumber });
    }
    if (adjustmentType === INVENTORY_ADJUSTMENT_TYPES.CUSTOMER_RETURN) {
      await this.audit(context, entityId, INVENTORY_AUDIT_ACTIONS.CUSTOMER_RETURN_POSTED, {
        documentNumber,
      });
    }
    if (adjustmentType === INVENTORY_ADJUSTMENT_TYPES.SUPPLIER_RETURN) {
      await this.audit(context, entityId, INVENTORY_AUDIT_ACTIONS.SUPPLIER_RETURN_POSTED, {
        documentNumber,
      });
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

  private async requireAdjustment(businessId: string, adjustmentId: string) {
    const row = await this.deps.adjustments.findById(businessId, adjustmentId);
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
      entityName: "inventory_adjustment",
      entityId,
      action,
      outcome: "SUCCESS",
      reason,
      references,
    });
  }

  private async toView(businessId: string, adjustmentId: string): Promise<InventoryAdjustmentView> {
    const header = await this.requireAdjustment(businessId, adjustmentId);
    const location = await this.deps.locations.findById(businessId, header.locationId);
    const lines = await this.deps.adjustmentLines.listByHeader(businessId, header.id);
    const lineViews: InventoryAdjustmentLineView[] = [];
    let total = "0";
    for (const line of lines) {
      const item = await this.deps.stockItems.findById(businessId, line.stockItemId);
      const enteredUnit = await this.deps.units.findById(businessId, line.uomId);
      const baseUnit = item
        ? await this.deps.units.findById(businessId, item.baseUomId)
        : null;
      total = applyInboundQuantity(total, line.baseQuantity);
      lineViews.push({
        id: line.id,
        stockItemId: line.stockItemId,
        sku: item?.sku ?? "",
        quantity: line.quantity,
        uomCode: enteredUnit?.code ?? "",
        baseQuantity: line.baseQuantity,
        baseUomCode: baseUnit?.code ?? enteredUnit?.code ?? "",
        conversionFactor: line.conversionFactor,
        condition: line.condition,
        onHandBefore: line.onHandBefore,
        onHandAfter: line.onHandAfter,
        movementId: line.movementId,
      });
    }
    const type = header.adjustmentType as InventoryAdjustmentType;
    const control = await this.deps.controls.getControl(
      businessId,
      operationCodeForAdjustmentType(header.adjustmentType)
    );
    const decision = control
      ? await this.deps.workflow.evaluateOperationApproval({
          businessId,
          operationCode: control.code,
        })
      : { required: false, operation: operationCodeForAdjustmentType(header.adjustmentType) };
    return {
      id: header.id,
      documentNumber: header.documentNumber,
      status: header.status,
      adjustmentType: header.adjustmentType,
      adjustmentTypeLabel: INVENTORY_ADJUSTMENT_TYPE_LABELS[type] ?? header.adjustmentType,
      locationId: header.locationId,
      locationName: location?.name ?? "",
      reason: header.reason,
      notes: header.notes,
      externalReference: header.externalReference,
      originType: header.originType,
      originId: header.originId,
      originLineId: header.originLineId,
      createdAt: header.createdAt.toISOString(),
      createdBy: header.createdBy,
      submittedAt: header.submittedAt?.toISOString() ?? null,
      approvedAt: header.approvedAt?.toISOString() ?? null,
      postedAt: header.postedAt?.toISOString() ?? null,
      rejectedAt: header.rejectedAt?.toISOString() ?? null,
      cancelledAt: header.cancelledAt?.toISOString() ?? null,
      rejectionReason: header.rejectionReason,
      approvalRequired: decision.required,
      lineCount: lineViews.length,
      totalQuantity: total,
      lines: lineViews,
    };
  }
}

export function createDefaultStockAdjustmentDependencies(): StockAdjustmentServiceDependencies {
  const controls = createInventoryOperationControlRepository();
  const locks = createInProcessInventoryLock();
  return {
    stockItems: createStockItemRepository(),
    locations: createInventoryLocationRepository(),
    itemLocations: createStockItemLocationRepository(),
    movements: createInventoryMovementRepository(),
    balances: createInventoryBalanceRepository(),
    adjustments: createInventoryAdjustmentRepository(),
    adjustmentLines: createInventoryAdjustmentLineRepository(),
    controls,
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
  };
}

export function createStockAdjustmentService(deps?: StockAdjustmentServiceDependencies) {
  return new StockAdjustmentService(deps ?? createDefaultStockAdjustmentDependencies());
}
