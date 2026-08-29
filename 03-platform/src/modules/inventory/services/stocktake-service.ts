/**
 * Purpose:
 * Physical stocktake and reconciliation. Variances post through the
 * existing stock adjustment service. Reservations are not cancelled here.
 *
 * Implementation Package:
 * BP-008 / IP-06 – Stocktake & Inventory Reconciliation
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  absoluteInventoryQuantity,
  applyInboundQuantity,
  compareInventoryQuantity,
} from "@/core/inventory-engine";
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
  INVENTORY_ADJUSTMENT_TYPES,
  INVENTORY_AUDIT_ACTIONS,
  INVENTORY_IDEMPOTENCY_OPERATIONS,
  INVENTORY_OPERATION_CODES,
  INVENTORY_STOCKTAKE_LINE_STATUSES,
  INVENTORY_STOCKTAKE_SCOPE_TYPES,
  INVENTORY_STOCKTAKE_STATUSES,
  INVENTORY_VARIANCE_CLASSES,
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
  InventoryOperationControlPort,
  InventoryOpsIncidentPort,
  InventoryStocktakeCountRepositoryPort,
  InventoryStocktakeLineRepositoryPort,
  InventoryStocktakeRepositoryPort,
  InventoryTraceabilityPort,
  InventoryUnitCataloguePort,
  StockItemLocationRepositoryPort,
  StockItemRepositoryPort,
} from "@/modules/inventory/ports";
import { createInventoryControlWorkflowAdapter } from "@/modules/inventory/adapters/inventory-control-workflow-adapter";
import { createUnitOfMeasureAdapter } from "@/modules/inventory/adapters/unit-of-measure-adapter";
import { createInventoryBalanceRepository } from "@/modules/inventory/repositories/inventory-balance-repository";
import { createInventoryIdempotencyRepository } from "@/modules/inventory/repositories/inventory-idempotency-repository";
import { createInventoryLocationRepository } from "@/modules/inventory/repositories/inventory-location-repository";
import { createInventoryOperationControlRepository } from "@/modules/inventory/repositories/inventory-operation-control-repository";
import {
  createInventoryStocktakeCountRepository,
  createInventoryStocktakeLineRepository,
  createInventoryStocktakeRepository,
} from "@/modules/inventory/repositories/inventory-stocktake-repository";
import { createStockItemLocationRepository } from "@/modules/inventory/repositories/stock-item-location-repository";
import { createStockItemRepository } from "@/modules/inventory/repositories/stock-item-repository";
import { createInventoryAuditAdapter } from "@/modules/inventory/services/inventory-audit-helper";
import { parseOptionalDate } from "@/modules/inventory/services/inventory-inbound-rules";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import { recordDetectedOpsIncident } from "@/modules/inventory/services/inventory-ops-incident-hook";
import { createInventoryOpsIncidentService } from "@/modules/inventory/services/inventory-ops-incident-service";
import {
  captureFromCommand,
  createTraceabilityService,
  requireModePort,
} from "@/modules/inventory/services/inventory-traceability-service";
import { trackingModeOf } from "@/modules/inventory/services/inventory-traceability-rules";
import {
  assertStocktakeCanApprove,
  assertStocktakeCanCancel,
  assertStocktakeCanComplete,
  assertStocktakeCanPost,
  assertStocktakeCanSubmit,
  assertStocktakeCountable,
  assertStocktakeScopeType,
  classifyVariance,
  computeVariance,
  createStocktakeIdempotencyKey,
  resolvePhysicalCountBaseQuantity,
} from "@/modules/inventory/services/inventory-stocktake-rules";
import { normalizeOptionalText } from "@/modules/inventory/services/stock-item-rules";
import {
  StockAdjustmentService,
  createStockAdjustmentService,
} from "@/modules/inventory/services/stock-adjustment-service";
import { ConfigurableDocumentNumberingService } from "@/core/localization-regulatory/services/document-numbering-service";
import { createDocumentNumberingPolicyRepository } from "@/core/localization-regulatory/repositories/document-numbering-policy-repository";
import type {
  CreateStocktakeCommand,
  InventoryStocktakeCountView,
  InventoryStocktakeLineView,
  InventoryStocktakeView,
  RecordStocktakeCountCommand,
} from "@/modules/inventory/types";

export type StocktakeServiceDependencies = {
  stockItems: StockItemRepositoryPort;
  locations: InventoryLocationRepositoryPort;
  itemLocations: StockItemLocationRepositoryPort;
  balances: InventoryBalanceRepositoryPort;
  stocktakes: InventoryStocktakeRepositoryPort;
  stocktakeLines: InventoryStocktakeLineRepositoryPort;
  stocktakeCounts: InventoryStocktakeCountRepositoryPort;
  controls: InventoryOperationControlPort;
  units: InventoryUnitCataloguePort;
  numbering: DocumentNumberingPort;
  workflow: WorkflowEnginePort;
  idempotency: InventoryIdempotencyPort;
  locks: InventoryLockPort;
  audit: InventoryAuditPort;
  adjustments: StockAdjustmentService;
  traceability?: InventoryTraceabilityPort | null;
  opsIncidents?: InventoryOpsIncidentPort;
};

function actorId(context: CurrentBusinessContext): string | null {
  return context.platformUserId || null;
}

export class StocktakeService {
  constructor(private readonly deps: StocktakeServiceDependencies) {}

  async listStocktakes(context: CurrentBusinessContext) {
    const rows = await this.deps.stocktakes.listByBusiness(context.businessId);
    const views: InventoryStocktakeView[] = [];
    for (const row of rows) {
      views.push(await this.toView(context.businessId, row.id));
    }
    return views;
  }

  async getStocktake(context: CurrentBusinessContext, stocktakeId: string) {
    return this.toView(context.businessId, stocktakeId);
  }

  async createStocktake(context: CurrentBusinessContext, command: CreateStocktakeCommand) {
    const businessId = context.businessId;
    const scopeType = assertStocktakeScopeType(command.scopeType);
    const idempotencyKey = createStocktakeIdempotencyKey(command.idempotencyKey);
    if (idempotencyKey) {
      const existing = await this.deps.stocktakes.findByIdempotencyKey(businessId, idempotencyKey);
      if (existing) {
        return this.toView(businessId, existing.id);
      }
    }
    await this.requireActiveLocation(businessId, command.locationId);
    if (scopeType === INVENTORY_STOCKTAKE_SCOPE_TYPES.ITEM && !(command.stockItemIds ?? []).length) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LINE_REQUIRED);
    }
    if (scopeType === INVENTORY_STOCKTAKE_SCOPE_TYPES.GROUP && !normalizeOptionalText(command.scopeGroup)) {
      throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "scopeGroup",
      });
    }
    const allocated = await this.deps.numbering.allocate({
      businessId,
      documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.STOCKTAKE,
    });
    const header = await this.deps.stocktakes.insert({
      businessId,
      documentNumber: allocated.number,
      status: INVENTORY_STOCKTAKE_STATUSES.DRAFT,
      locationId: command.locationId,
      scopeType,
      scopeGroup: normalizeOptionalText(command.scopeGroup),
      countedOn: command.countedOn ? parseOptionalDate(command.countedOn) : null,
      notes: normalizeOptionalText(command.notes),
      idempotencyKey,
      startedAt: null,
      startedBy: null,
      submittedAt: null,
      submittedBy: null,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
      postedAt: null,
      postedBy: null,
      completedAt: null,
      completedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      metadata: command.stockItemIds?.length ? { stockItemIds: command.stockItemIds } : null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    if (idempotencyKey) {
      await this.deps.idempotency.insert({
        businessId,
        idempotencyKey,
        operationType: INVENTORY_IDEMPOTENCY_OPERATIONS.CREATE_STOCKTAKE,
        resourceType: "inventory_stocktake",
        resourceId: header.id,
        createdBy: actorId(context),
      });
    }
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.STOCKTAKE_CREATED, {
      documentNumber: header.documentNumber,
      locationId: header.locationId,
      scopeType,
    });
    return this.toView(businessId, header.id);
  }

  async startStocktake(context: CurrentBusinessContext, stocktakeId: string) {
    const businessId = context.businessId;
    const header = await this.requireStocktake(businessId, stocktakeId);
    if (header.status !== INVENTORY_STOCKTAKE_STATUSES.DRAFT) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_EDITABLE);
    }
    const existing = await this.deps.stocktakeLines.listByHeader(businessId, header.id);
    if (existing.length > 0) {
      return this.toView(businessId, header.id);
    }
    const targets = await this.resolveScopeItems(businessId, header);
    if (targets.length === 0) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LINE_REQUIRED);
    }
    const snapshotTakenAt = new Date();
    let lineNumber = 1;
    for (const stockItem of targets) {
      const balance = await this.deps.balances.findByItemAndLocation(
        businessId,
        stockItem.id,
        header.locationId
      );
      await this.deps.stocktakeLines.insert({
        businessId,
        headerId: header.id,
        lineNumber,
        stockItemId: stockItem.id,
        locationId: header.locationId,
        snapshotQuantity: balance?.onHand ?? "0",
        snapshotTakenAt,
        countedQuantity: null,
        countedUomId: null,
        countedBaseQuantity: null,
        conversionFactor: null,
        varianceQuantity: null,
        varianceClass: null,
        countStatus: INVENTORY_STOCKTAKE_LINE_STATUSES.PENDING,
        adjustmentId: null,
        movementId: null,
        notes: null,
        createdBy: actorId(context),
        updatedBy: actorId(context),
      });
      lineNumber += 1;
    }
    await this.deps.stocktakes.update(businessId, header.id, {
      status: INVENTORY_STOCKTAKE_STATUSES.IN_PROGRESS,
      startedAt: snapshotTakenAt,
      startedBy: actorId(context),
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.STOCKTAKE_STARTED, {
      documentNumber: header.documentNumber,
      lineCount: targets.length,
    });
    return this.toView(businessId, header.id);
  }

  async recordCount(
    context: CurrentBusinessContext,
    stocktakeId: string,
    lineId: string,
    command: RecordStocktakeCountCommand
  ) {
    return this.saveCount(context, stocktakeId, lineId, command, false);
  }

  async recountLine(
    context: CurrentBusinessContext,
    stocktakeId: string,
    lineId: string,
    command: RecordStocktakeCountCommand
  ) {
    return this.saveCount(context, stocktakeId, lineId, command, true);
  }

  async submitStocktake(context: CurrentBusinessContext, stocktakeId: string) {
    const businessId = context.businessId;
    const header = await this.requireStocktake(businessId, stocktakeId);
    assertStocktakeCanSubmit(header.status);
    const lines = await this.deps.stocktakeLines.listByHeader(businessId, header.id);
    if (lines.length === 0 || lines.some((line) => line.countStatus === INVENTORY_STOCKTAKE_LINE_STATUSES.PENDING)) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCKTAKE_COUNT_REQUIRED);
    }
    const control = await this.requireControl(businessId);
    const decision = await this.deps.workflow.evaluateOperationApproval({
      businessId,
      operationCode: control.code,
    });
    const nextStatus = decision.required
      ? INVENTORY_STOCKTAKE_STATUSES.APPROVAL_PENDING
      : INVENTORY_STOCKTAKE_STATUSES.SUBMITTED;
    await this.deps.stocktakes.update(businessId, header.id, {
      status: nextStatus,
      submittedAt: new Date(),
      submittedBy: actorId(context),
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(
      context,
      header.id,
      decision.required
        ? INVENTORY_AUDIT_ACTIONS.STOCKTAKE_APPROVAL_REQUESTED
        : INVENTORY_AUDIT_ACTIONS.STOCKTAKE_SUBMITTED,
      { documentNumber: header.documentNumber }
    );
    return this.toView(businessId, header.id);
  }

  async approveStocktake(context: CurrentBusinessContext, stocktakeId: string) {
    const businessId = context.businessId;
    const header = await this.requireStocktake(businessId, stocktakeId);
    assertStocktakeCanApprove(header.status);
    this.assertChecker(header.submittedBy, actorId(context));
    await this.deps.stocktakes.update(businessId, header.id, {
      status: INVENTORY_STOCKTAKE_STATUSES.APPROVED,
      approvedAt: new Date(),
      approvedBy: actorId(context),
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.STOCKTAKE_APPROVED, {
      documentNumber: header.documentNumber,
    });
    return this.toView(businessId, header.id);
  }

  async rejectStocktake(context: CurrentBusinessContext, stocktakeId: string, reason: string) {
    const businessId = context.businessId;
    const header = await this.requireStocktake(businessId, stocktakeId);
    assertStocktakeCanApprove(header.status);
    const rejectionReason = normalizeOptionalText(reason);
    if (!rejectionReason) {
      throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "reason",
      });
    }
    this.assertChecker(header.submittedBy, actorId(context));
    await this.deps.stocktakes.update(businessId, header.id, {
      status: INVENTORY_STOCKTAKE_STATUSES.IN_PROGRESS,
      rejectedAt: new Date(),
      rejectedBy: actorId(context),
      rejectionReason,
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(
      context,
      header.id,
      INVENTORY_AUDIT_ACTIONS.STOCKTAKE_REJECTED,
      { documentNumber: header.documentNumber },
      rejectionReason
    );
    return this.toView(businessId, header.id);
  }

  async cancelStocktake(context: CurrentBusinessContext, stocktakeId: string) {
    const businessId = context.businessId;
    const header = await this.requireStocktake(businessId, stocktakeId);
    assertStocktakeCanCancel(header.status);
    await this.deps.stocktakes.update(businessId, header.id, {
      status: INVENTORY_STOCKTAKE_STATUSES.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: actorId(context),
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.STOCKTAKE_CANCELLED, {
      documentNumber: header.documentNumber,
    });
    return this.toView(businessId, header.id);
  }

  async postStocktake(context: CurrentBusinessContext, stocktakeId: string) {
    const businessId = context.businessId;
    const header = await this.requireStocktake(businessId, stocktakeId);
    if (
      header.status === INVENTORY_STOCKTAKE_STATUSES.POSTED ||
      header.status === INVENTORY_STOCKTAKE_STATUSES.COMPLETED
    ) {
      return this.toView(businessId, header.id);
    }
    const control = await this.requireControl(businessId);
    const decision = await this.deps.workflow.evaluateOperationApproval({
      businessId,
      operationCode: control.code,
    });
    assertStocktakeCanPost(header.status, decision.required);
    const scopedLines = await this.deps.stocktakeLines.listByHeader(businessId, header.id);
    if (
      scopedLines.length === 0 ||
      scopedLines.some((line) => line.countStatus === INVENTORY_STOCKTAKE_LINE_STATUSES.PENDING)
    ) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCKTAKE_COUNT_REQUIRED);
    }
    const lockKeys = [
      `${businessId}:stocktake:${header.id}`,
      ...[
        ...new Set(
          scopedLines.map(
            (line) => `${businessId}:availability:${line.stockItemId}:${header.locationId}`
          )
        ),
      ].sort(),
    ];
    return this.runLocks(lockKeys, async () => {
      const current = await this.requireStocktake(businessId, stocktakeId);
      if (
        current.status === INVENTORY_STOCKTAKE_STATUSES.POSTED ||
        current.status === INVENTORY_STOCKTAKE_STATUSES.COMPLETED
      ) {
        return this.toView(businessId, current.id);
      }
      const postKey = `${INVENTORY_IDEMPOTENCY_OPERATIONS.POST_STOCKTAKE}:${current.id}`;
      const existingKey = await this.deps.idempotency.find(
        businessId,
        INVENTORY_IDEMPOTENCY_OPERATIONS.POST_STOCKTAKE,
        postKey
      );
      if (existingKey) {
        return this.toView(businessId, current.id);
      }
      const lines = await this.deps.stocktakeLines.listByHeader(businessId, current.id);
      for (const line of lines) {
        const balance = await this.deps.balances.findByItemAndLocation(
          businessId,
          line.stockItemId,
          current.locationId
        );
        const currentOnHand = balance?.onHand ?? "0";
        if (compareInventoryQuantity(currentOnHand, line.snapshotQuantity) !== 0) {
          throw new InventoryError(INVENTORY_ERROR_CODES.STOCKTAKE_BASIS_CHANGED, undefined, 409);
        }
      }
      for (const line of lines) {
        if (line.adjustmentId) {
          continue;
        }
        if (!line.countedBaseQuantity || line.varianceClass === INVENTORY_VARIANCE_CLASSES.ZERO) {
          continue;
        }
        const quantity = absoluteInventoryQuantity(line.varianceQuantity ?? "0");
        if (compareInventoryQuantity(quantity, "0") === 0) {
          continue;
        }
        const adjustmentType =
          line.varianceClass === INVENTORY_VARIANCE_CLASSES.POSITIVE
            ? INVENTORY_ADJUSTMENT_TYPES.POSITIVE_ADJUSTMENT
            : INVENTORY_ADJUSTMENT_TYPES.NEGATIVE_ADJUSTMENT;
        const lineCapture = await this.deps.traceability?.getCapture(
          context,
          "STOCKTAKE",
          line.id
        );
        const created = await this.deps.adjustments.createAdjustment(context, {
          locationId: current.locationId,
          adjustmentType,
          reason: "Physical count reconciliation",
          stockItemId: line.stockItemId,
          quantity,
          originType: "STOCKTAKE",
          originId: current.id,
          originLineId: line.id,
          externalReference: `STK:${current.id}:${line.id}`,
          idempotencyKey: `${INVENTORY_IDEMPOTENCY_OPERATIONS.POST_STOCKTAKE}:${current.id}:${line.id}`,
          lotCode: lineCapture?.lotCode,
          unitCodes: lineCapture?.unitCodes,
          manufacturedOn: lineCapture?.manufacturedOn,
          expiresOn: lineCapture?.expiresOn,
        });
        const posted = await this.deps.adjustments.postAdjustment(context, created.id);
        await this.deps.stocktakeLines.update(businessId, line.id, {
          adjustmentId: posted.id,
          movementId: posted.lines[0]?.movementId ?? null,
          updatedBy: actorId(context),
        });
      }
      await this.deps.idempotency.insert({
        businessId,
        idempotencyKey: postKey,
        operationType: INVENTORY_IDEMPOTENCY_OPERATIONS.POST_STOCKTAKE,
        resourceType: "inventory_stocktake",
        resourceId: current.id,
        createdBy: actorId(context),
      });
      await this.deps.stocktakes.update(businessId, current.id, {
        status: INVENTORY_STOCKTAKE_STATUSES.POSTED,
        postedAt: new Date(),
        postedBy: actorId(context),
        updatedBy: actorId(context),
        version: current.version + 1,
      });
      await this.audit(context, current.id, INVENTORY_AUDIT_ACTIONS.STOCKTAKE_RECONCILIATION_POSTED, {
        documentNumber: current.documentNumber,
      });
      const materialVariance = lines.some(
        (line) =>
          line.varianceClass !== INVENTORY_VARIANCE_CLASSES.ZERO &&
          compareInventoryQuantity(line.varianceQuantity ?? "0", "0") !== 0
      );
      if (materialVariance) {
        await recordDetectedOpsIncident(this.deps.opsIncidents, context, {
          incidentType: INVENTORY_OPS_INCIDENT_TYPES.STOCKTAKE_VARIANCE,
          severity: "MEDIUM",
          sourceType: "STOCKTAKE",
          sourceId: current.id,
          locationId: current.locationId,
          description: "A counted quantity differs from the system quantity.",
          idempotencyKey: `stocktake-variance:${current.id}`,
        });
      }
      return this.toView(businessId, current.id);
    });
  }

  async completeStocktake(context: CurrentBusinessContext, stocktakeId: string) {
    const businessId = context.businessId;
    const header = await this.requireStocktake(businessId, stocktakeId);
    assertStocktakeCanComplete(header.status);
    await this.deps.stocktakes.update(businessId, header.id, {
      status: INVENTORY_STOCKTAKE_STATUSES.COMPLETED,
      completedAt: new Date(),
      completedBy: actorId(context),
      updatedBy: actorId(context),
      version: header.version + 1,
    });
    await this.audit(context, header.id, INVENTORY_AUDIT_ACTIONS.STOCKTAKE_COMPLETED, {
      documentNumber: header.documentNumber,
    });
    return this.toView(businessId, header.id);
  }

  private async saveCount(
    context: CurrentBusinessContext,
    stocktakeId: string,
    lineId: string,
    command: RecordStocktakeCountCommand,
    isRecount: boolean
  ) {
    const businessId = context.businessId;
    const header = await this.requireStocktake(businessId, stocktakeId);
    assertStocktakeCountable(header.status);
    const line = await this.deps.stocktakeLines.findById(businessId, lineId);
    if (!line || line.headerId !== header.id) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCKTAKE_LINE_NOT_FOUND, undefined, 404);
    }
    if (isRecount && line.countStatus === INVENTORY_STOCKTAKE_LINE_STATUSES.PENDING) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCKTAKE_COUNT_REQUIRED);
    }
    const stockItem = await this.requireInboundStockItem(businessId, line.stockItemId, header.locationId);
    const uomId = command.uomId?.trim() || stockItem.baseUomId;
    await this.requireUnit(businessId, uomId);
    const converted = resolvePhysicalCountBaseQuantity({
      enteredQuantity: command.quantity,
      enteredUomId: uomId,
      stockItem,
    });
    const variance = computeVariance(converted.baseQuantity, line.snapshotQuantity);
    const history = await this.deps.stocktakeCounts.listByLine(businessId, line.id);
    await this.deps.stocktakeCounts.insert({
      businessId,
      lineId: line.id,
      sequence: history.length + 1,
      enteredQuantity: converted.enteredQuantity,
      uomId: converted.enteredUomId,
      baseQuantity: converted.baseQuantity,
      conversionFactor: converted.conversionFactor,
      isRecount: isRecount || history.length > 0,
      countedAt: new Date(),
      countedBy: actorId(context),
    });
    await this.deps.stocktakeLines.update(businessId, line.id, {
      countedQuantity: converted.enteredQuantity,
      countedUomId: converted.enteredUomId,
      countedBaseQuantity: converted.baseQuantity,
      conversionFactor: converted.conversionFactor,
      varianceQuantity: variance,
      varianceClass: classifyVariance(variance),
      countStatus:
        isRecount || history.length > 0
          ? INVENTORY_STOCKTAKE_LINE_STATUSES.RECOUNTED
          : INVENTORY_STOCKTAKE_LINE_STATUSES.COUNTED,
      notes: normalizeOptionalText(command.notes),
      updatedBy: actorId(context),
    });
    requireModePort(trackingModeOf(stockItem), this.deps.traceability);
    await this.deps.traceability?.captureLine(context, {
      sourceType: "STOCKTAKE",
      sourceId: header.id,
      sourceLineId: line.id,
      stockItem,
      capture: captureFromCommand(command),
      baseQuantity: converted.baseQuantity,
      direction: classifyVariance(variance) === INVENTORY_VARIANCE_CLASSES.POSITIVE ? "IN" : "OUT",
    });
    await this.audit(
      context,
      header.id,
      isRecount || history.length > 0
        ? INVENTORY_AUDIT_ACTIONS.STOCKTAKE_RECOUNT_RECORDED
        : INVENTORY_AUDIT_ACTIONS.STOCKTAKE_COUNT_RECORDED,
      {
        documentNumber: header.documentNumber,
        lineId: line.id,
        stockItemId: line.stockItemId,
        locationId: header.locationId,
        snapshotQuantity: line.snapshotQuantity,
        countedQuantity: converted.baseQuantity,
        variance,
      }
    );
    return this.toView(businessId, header.id);
  }

  private async resolveScopeItems(businessId: string, header: { locationId: string; scopeType: string; scopeGroup: string | null; metadata: Record<string, unknown> | null }) {
    const configs = await this.deps.itemLocations.listByLocation(businessId, header.locationId);
    const active = configs.filter((row) => row.isActive);
    const items = [];
    for (const config of active) {
      const stockItem = await this.deps.stockItems.findById(businessId, config.stockItemId);
      if (!stockItem || !stockItem.isActive || !stockItem.stockTrackingEnabled) {
        continue;
      }
      if (stockItem.itemTypeCode !== STOCK_ITEM_TYPE_CODES.STOCKED_ITEM) {
        continue;
      }
      if (header.scopeType === INVENTORY_STOCKTAKE_SCOPE_TYPES.ITEM) {
        const allowed = Array.isArray(header.metadata?.stockItemIds)
          ? (header.metadata.stockItemIds as string[])
          : [];
        if (!allowed.includes(stockItem.id)) {
          continue;
        }
      }
      if (
        header.scopeType === INVENTORY_STOCKTAKE_SCOPE_TYPES.GROUP &&
        header.scopeGroup &&
        stockItem.itemTypeCode !== header.scopeGroup
      ) {
        continue;
      }
      items.push(stockItem);
    }
    return items;
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

  private async requireControl(businessId: string) {
    const control = await this.deps.controls.getControl(
      businessId,
      INVENTORY_OPERATION_CODES.STOCKTAKE
    );
    if (!control) {
      throw new InventoryError(INVENTORY_ERROR_CODES.OPERATION_CONTROL_MISSING, undefined, 409);
    }
    return control;
  }

  private async requireStocktake(businessId: string, stocktakeId: string) {
    const row = await this.deps.stocktakes.findById(businessId, stocktakeId);
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
      entityName: "inventory_stocktake",
      entityId,
      action,
      outcome: "SUCCESS",
      reason,
      references,
    });
  }

  private async toView(businessId: string, stocktakeId: string): Promise<InventoryStocktakeView> {
    const header = await this.requireStocktake(businessId, stocktakeId);
    const location = await this.deps.locations.findById(businessId, header.locationId);
    const lines = await this.deps.stocktakeLines.listByHeader(businessId, header.id);
    const lineViews: InventoryStocktakeLineView[] = [];
    let varianceCount = 0;
    let totalPositive = "0";
    let totalNegative = "0";
    for (const line of lines) {
      const item = await this.deps.stockItems.findById(businessId, line.stockItemId);
      const countedUnit = line.countedUomId
        ? await this.deps.units.findById(businessId, line.countedUomId)
        : null;
      const baseUnit = item ? await this.deps.units.findById(businessId, item.baseUomId) : null;
      const history = await this.deps.stocktakeCounts.listByLine(businessId, line.id);
      const counts: InventoryStocktakeCountView[] = [];
      for (const count of history) {
        const unit = await this.deps.units.findById(businessId, count.uomId);
        counts.push({
          sequence: count.sequence,
          enteredQuantity: count.enteredQuantity,
          uomCode: unit?.code ?? "",
          baseQuantity: count.baseQuantity,
          isRecount: count.isRecount,
          countedAt: count.countedAt.toISOString(),
        });
      }
      if (line.varianceClass && line.varianceClass !== INVENTORY_VARIANCE_CLASSES.ZERO) {
        varianceCount += 1;
        const amount = absoluteInventoryQuantity(line.varianceQuantity ?? "0");
        if (line.varianceClass === INVENTORY_VARIANCE_CLASSES.POSITIVE) {
          totalPositive = applyInboundQuantity(totalPositive, amount);
        } else {
          totalNegative = applyInboundQuantity(totalNegative, amount);
        }
      }
      lineViews.push({
        id: line.id,
        stockItemId: line.stockItemId,
        sku: item?.sku ?? "",
        snapshotQuantity: line.snapshotQuantity,
        countedQuantity: line.countedQuantity,
        countedBaseQuantity: line.countedBaseQuantity,
        uomCode: countedUnit?.code ?? baseUnit?.code ?? "",
        baseUomCode: baseUnit?.code ?? "",
        varianceQuantity: line.varianceQuantity,
        varianceClass: line.varianceClass,
        countStatus: line.countStatus,
        adjustmentId: line.adjustmentId,
        movementId: line.movementId,
        counts,
      });
    }
    const control = await this.deps.controls.getControl(
      businessId,
      INVENTORY_OPERATION_CODES.STOCKTAKE
    );
    const decision = control
      ? await this.deps.workflow.evaluateOperationApproval({
          businessId,
          operationCode: control.code,
        })
      : { required: false, operation: INVENTORY_OPERATION_CODES.STOCKTAKE };
    return {
      id: header.id,
      documentNumber: header.documentNumber,
      status: header.status,
      locationId: header.locationId,
      locationName: location?.name ?? "",
      scopeType: header.scopeType,
      scopeGroup: header.scopeGroup,
      notes: header.notes,
      createdAt: header.createdAt.toISOString(),
      createdBy: header.createdBy,
      startedAt: header.startedAt?.toISOString() ?? null,
      submittedAt: header.submittedAt?.toISOString() ?? null,
      approvedAt: header.approvedAt?.toISOString() ?? null,
      postedAt: header.postedAt?.toISOString() ?? null,
      completedAt: header.completedAt?.toISOString() ?? null,
      cancelledAt: header.cancelledAt?.toISOString() ?? null,
      rejectionReason: header.rejectionReason,
      approvalRequired: decision.required,
      lineCount: lineViews.length,
      varianceCount,
      totalPositiveVariance: totalPositive,
      totalNegativeVariance: totalNegative,
      lines: lineViews,
    };
  }
}

export function createDefaultStocktakeDependencies(): StocktakeServiceDependencies {
  const controls = createInventoryOperationControlRepository();
  return {
    stockItems: createStockItemRepository(),
    locations: createInventoryLocationRepository(),
    itemLocations: createStockItemLocationRepository(),
    balances: createInventoryBalanceRepository(),
    stocktakes: createInventoryStocktakeRepository(),
    stocktakeLines: createInventoryStocktakeLineRepository(),
    stocktakeCounts: createInventoryStocktakeCountRepository(),
    controls,
    units: createUnitOfMeasureAdapter(),
    numbering: new ConfigurableDocumentNumberingService(
      createDocumentNumberingPolicyRepository()
    ),
    workflow: createInventoryControlWorkflowAdapter(controls),
    idempotency: createInventoryIdempotencyRepository(),
    locks: createInProcessInventoryLock(),
    audit: createInventoryAuditAdapter(),
    adjustments: createStockAdjustmentService(),
    traceability: createTraceabilityService(),
    opsIncidents: createInventoryOpsIncidentService(),
  };
}

export function createStocktakeService(deps?: StocktakeServiceDependencies) {
  return new StocktakeService(deps ?? createDefaultStocktakeDependencies());
}
