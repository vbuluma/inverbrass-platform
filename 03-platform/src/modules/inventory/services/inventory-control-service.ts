/**
 * Purpose:
 * Evaluate inventory control status and raise replenishment advice.
 * Does not purchase, receive, transfer, or mutate ledger quantities.
 *
 * Implementation Package:
 * BP-008 / IP-08 – Reorder & Inventory Controls
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { createDocumentNumberingPolicyRepository } from "@/core/localization-regulatory/repositories/document-numbering-policy-repository";
import { ConfigurableDocumentNumberingService } from "@/core/localization-regulatory/services/document-numbering-service";
import type { DocumentNumberingPort } from "@/core/localization-regulatory/document-numbering";
import { WorkflowEngineError, WORKFLOW_ENGINE_ERROR_CODES } from "@/core/workflow-engine";
import type { WorkflowEnginePort } from "@/core/workflow-engine";
import { applyInboundQuantity } from "@/core/inventory-engine";
import { createInventoryControlWorkflowAdapter } from "@/modules/inventory/adapters/inventory-control-workflow-adapter";
import {
  INVENTORY_ADVICE_STATUSES,
  INVENTORY_AUDIT_ACTIONS,
  INVENTORY_CONTROL_CHANGE_STATUSES,
  INVENTORY_CONTROL_STATUSES,
  INVENTORY_EXPIRY_STATUSES,
  INVENTORY_IDEMPOTENCY_OPERATIONS,
  INVENTORY_OPERATION_CODES,
  INVENTORY_OPS_INCIDENT_TYPES,
} from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryAuditPort,
  InventoryBalanceRepositoryPort,
  InventoryControlChangeRepositoryPort,
  InventoryIdempotencyPort,
  InventoryLocationRepositoryPort,
  InventoryLockPort,
  InventoryOperationControlPort,
  InventoryOpsIncidentPort,
  InventoryProductCataloguePort,
  InventoryReplenishmentAdviceRepositoryPort,
  InventoryTraceabilityPort,
  StockItemLocationRepositoryPort,
  StockItemRepositoryPort,
} from "@/modules/inventory/ports";
import { createInventoryAuditAdapter } from "@/modules/inventory/services/inventory-audit-helper";
import {
  assertControlSettings,
  evaluateControlStatus,
  hasConfiguredThresholds,
  recommendedReplenishmentQuantity,
  resolveEffectiveSettings,
  saleableFromLedger,
} from "@/modules/inventory/services/inventory-control-rules";
import { createInventoryIdempotencyRepository } from "@/modules/inventory/repositories/inventory-idempotency-repository";
import { createInventoryBalanceRepository } from "@/modules/inventory/repositories/inventory-balance-repository";
import {
  createInventoryControlChangeRepository,
  createInventoryReplenishmentAdviceRepository,
} from "@/modules/inventory/repositories/inventory-control-repository";
import { createInventoryLocationRepository } from "@/modules/inventory/repositories/inventory-location-repository";
import { createStockItemLocationRepository } from "@/modules/inventory/repositories/stock-item-location-repository";
import { createStockItemRepository } from "@/modules/inventory/repositories/stock-item-repository";
import { createInventoryOperationControlRepository } from "@/modules/inventory/repositories/inventory-operation-control-repository";
import { createProductCatalogueAdapter } from "@/modules/inventory/adapters/product-catalogue-adapter";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import { recordDetectedOpsIncident } from "@/modules/inventory/services/inventory-ops-incident-hook";
import { createInventoryOpsIncidentService } from "@/modules/inventory/services/inventory-ops-incident-service";
import { createTraceabilityService } from "@/modules/inventory/services/inventory-traceability-service";
import type {
  InventoryControlDashboardView,
  InventoryControlPositionView,
  InventoryControlSettings,
  SaveInventoryControlSettingsCommand,
  StockItemRecord,
} from "@/modules/inventory/types";

export type InventoryControlServiceDependencies = {
  products: InventoryProductCataloguePort;
  stockItems: StockItemRepositoryPort;
  locations: InventoryLocationRepositoryPort;
  itemLocations: StockItemLocationRepositoryPort;
  balances: InventoryBalanceRepositoryPort;
  advice: InventoryReplenishmentAdviceRepositoryPort;
  changes: InventoryControlChangeRepositoryPort;
  controls: InventoryOperationControlPort;
  workflow: WorkflowEnginePort;
  numbering: DocumentNumberingPort;
  idempotency: InventoryIdempotencyPort;
  locks: InventoryLockPort;
  audit: InventoryAuditPort;
  traceability?: InventoryTraceabilityPort;
  opsIncidents?: InventoryOpsIncidentPort;
};

function actorId(context: CurrentBusinessContext): string | null {
  return context.platformUserId || null;
}

function lockKey(businessId: string) {
  return `inventory-control:${businessId}`;
}

export class InventoryControlService {
  constructor(private readonly deps: InventoryControlServiceDependencies) {}

  async saveControlSettings(
    context: CurrentBusinessContext,
    command: SaveInventoryControlSettingsCommand
  ) {
    const businessId = context.businessId;
    let settings;
    try {
      settings = assertControlSettings(command);
    } catch (error) {
      if (
        error instanceof InventoryError &&
        error.code === INVENTORY_ERROR_CODES.INVALID_CONTROL_CONFIGURATION
      ) {
        await recordDetectedOpsIncident(this.deps.opsIncidents, context, {
          incidentType: INVENTORY_OPS_INCIDENT_TYPES.CONTROL_CONFIGURATION_EXCEPTION,
          severity: "MEDIUM",
          sourceType: "CONTROL_SETTINGS",
          sourceId: command.stockItemId,
          stockItemId: command.stockItemId,
          locationId: command.locationId ?? null,
          description: "Inventory control levels are missing or invalid.",
          idempotencyKey: `control-config:${command.stockItemId}:${command.locationId ?? "item"}`,
        });
      }
      throw error;
    }
    return this.deps.locks.runExclusive(lockKey(businessId), async () => {
      const item = await this.requireItem(businessId, command.stockItemId);
      if (command.locationId) {
        const location = await this.deps.locations.findById(businessId, command.locationId);
        if (!location) {
          throw new InventoryError(INVENTORY_ERROR_CODES.LOCATION_NOT_FOUND, undefined, 404);
        }
      }
      const previous = await this.currentSettings(businessId, item, command.locationId);
      const decision = await this.deps.workflow.evaluateOperationApproval({
        businessId,
        operationCode: INVENTORY_OPERATION_CODES.INVENTORY_CONTROL_CONFIG,
      });
      if (!decision.required) {
        await this.applySettings(businessId, item, command.locationId ?? null, settings, actorId(context));
        await this.deps.audit.record({
          businessId,
          actorUserId: actorId(context),
          entityName: "stock_item",
          entityId: item.id,
          action: previous.configured
            ? INVENTORY_AUDIT_ACTIONS.CONTROL_SETTINGS_CHANGED
            : INVENTORY_AUDIT_ACTIONS.CONTROL_SETTINGS_CREATED,
          outcome: "SUCCESS",
          references: {
            stockItemId: item.id,
            locationId: command.locationId ?? null,
            previous: previous.settings,
            next: settings,
          },
        });
        return { status: "APPLIED" as const, changeId: null, settings };
      }
      const change = await this.deps.changes.insert({
        businessId,
        stockItemId: item.id,
        locationId: command.locationId ?? null,
        status: INVENTORY_CONTROL_CHANGE_STATUSES.APPROVAL_PENDING,
        previousSettings: previous.settings,
        proposedSettings: settings,
        submittedBy: actorId(context),
        submittedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
        reviewReason: null,
        createdBy: actorId(context),
        updatedBy: actorId(context),
      });
      await this.deps.audit.record({
        businessId,
        actorUserId: actorId(context),
        entityName: "inventory_control_change",
        entityId: change.id,
        action: INVENTORY_AUDIT_ACTIONS.CONTROL_CHANGE_SUBMITTED,
        outcome: "SUCCESS",
        references: { stockItemId: item.id, locationId: command.locationId ?? null },
      });
      return { status: "APPROVAL_PENDING" as const, changeId: change.id, settings };
    });
  }

  async approveControlChange(
    context: CurrentBusinessContext,
    changeId: string,
    reason?: string | null
  ) {
    const businessId = context.businessId;
    return this.deps.locks.runExclusive(lockKey(businessId), async () => {
      const change = await this.deps.changes.findById(businessId, changeId);
      if (!change) {
        throw new InventoryError(INVENTORY_ERROR_CODES.CONTROL_CHANGE_NOT_FOUND, undefined, 404);
      }
      if (change.status !== INVENTORY_CONTROL_CHANGE_STATUSES.APPROVAL_PENDING) {
        throw new InventoryError(INVENTORY_ERROR_CODES.CONTROL_CHANGE_NOT_REVIEWABLE);
      }
      this.assertChecker(change.submittedBy, actorId(context));
      const item = await this.requireItem(businessId, change.stockItemId);
      await this.applySettings(
        businessId,
        item,
        change.locationId,
        change.proposedSettings,
        actorId(context)
      );
      const updated = await this.deps.changes.update(businessId, change.id, {
        status: INVENTORY_CONTROL_CHANGE_STATUSES.APPROVED,
        reviewedBy: actorId(context),
        reviewedAt: new Date(),
        reviewReason: reason ?? null,
        updatedBy: actorId(context),
      });
      await this.deps.audit.record({
        businessId,
        actorUserId: actorId(context),
        entityName: "inventory_control_change",
        entityId: change.id,
        action: INVENTORY_AUDIT_ACTIONS.CONTROL_CHANGE_APPROVED,
        outcome: "SUCCESS",
        references: { stockItemId: item.id, locationId: change.locationId },
      });
      return updated;
    });
  }

  async rejectControlChange(
    context: CurrentBusinessContext,
    changeId: string,
    reason?: string | null
  ) {
    const businessId = context.businessId;
    return this.deps.locks.runExclusive(lockKey(businessId), async () => {
      const change = await this.deps.changes.findById(businessId, changeId);
      if (!change) {
        throw new InventoryError(INVENTORY_ERROR_CODES.CONTROL_CHANGE_NOT_FOUND, undefined, 404);
      }
      if (change.status !== INVENTORY_CONTROL_CHANGE_STATUSES.APPROVAL_PENDING) {
        throw new InventoryError(INVENTORY_ERROR_CODES.CONTROL_CHANGE_NOT_REVIEWABLE);
      }
      this.assertChecker(change.submittedBy, actorId(context));
      const updated = await this.deps.changes.update(businessId, change.id, {
        status: INVENTORY_CONTROL_CHANGE_STATUSES.REJECTED,
        reviewedBy: actorId(context),
        reviewedAt: new Date(),
        reviewReason: reason ?? null,
        updatedBy: actorId(context),
      });
      await this.deps.audit.record({
        businessId,
        actorUserId: actorId(context),
        entityName: "inventory_control_change",
        entityId: change.id,
        action: INVENTORY_AUDIT_ACTIONS.CONTROL_CHANGE_REJECTED,
        outcome: "SUCCESS",
        references: { stockItemId: change.stockItemId, locationId: change.locationId },
      });
      return updated;
    });
  }

  async evaluateStockControls(
    context: CurrentBusinessContext,
    query?: { locationId?: string | null; status?: string | null; stockItemId?: string | null }
  ): Promise<InventoryControlDashboardView> {
    const businessId = context.businessId;
    const [items, locations, balances, advice, changes] = await Promise.all([
      this.deps.stockItems.listByBusiness(businessId),
      this.deps.locations.listByBusiness(businessId),
      this.deps.balances.listByBusiness(businessId),
      this.deps.advice.listByBusiness(businessId),
      this.deps.changes.listByBusiness(businessId),
    ]);
    const locationById = new Map(locations.map((row) => [row.id, row]));
    const rows: InventoryControlPositionView[] = [];
    for (const item of items.filter(
      (row) => row.isActive && row.itemTypeCode === "STOCKED_ITEM" && row.stockTrackingEnabled
    )) {
      if (query?.stockItemId && item.id !== query.stockItemId) {
        continue;
      }
      const configs = await this.deps.itemLocations.listByStockItem(businessId, item.id);
      const product = await this.deps.products.findById(businessId, item.productId);
      for (const config of configs.filter((row) => row.isActive)) {
        if (query?.locationId && config.locationId !== query.locationId) {
          continue;
        }
        const location = locationById.get(config.locationId);
        if (!location) {
          continue;
        }
        const balance = balances.find(
          (row) => row.stockItemId === item.id && row.locationId === config.locationId
        );
        const settings = resolveEffectiveSettings({ item, location: config });
        const expiredQuantity = await this.expiredQuantity(context, item, config.locationId);
        const position = saleableFromLedger({
          onHand: balance?.onHand ?? "0",
          reserved: balance?.reserved ?? "0",
          expiredQuantity: item.allowExpiredFulfilment ? "0" : expiredQuantity,
        });
        const status = evaluateControlStatus({
          available: position.saleableAvailable,
          settings,
        });
        if (query?.status && status !== query.status) {
          continue;
        }
        const active = advice.find(
          (row) =>
            row.stockItemId === item.id &&
            row.locationId === config.locationId &&
            (row.status === INVENTORY_ADVICE_STATUSES.OPEN ||
              row.status === INVENTORY_ADVICE_STATUSES.ACKNOWLEDGED)
        );
        rows.push({
          stockItemId: item.id,
          sku: item.sku,
          productName: product?.productName ?? "",
          locationId: location.id,
          locationName: location.name,
          trackingMode: item.trackingMode,
          onHand: position.available === position.saleableAvailable ? (balance?.onHand ?? "0") : (balance?.onHand ?? "0"),
          reserved: balance?.reserved ?? "0",
          available: position.available,
          saleableAvailable: position.saleableAvailable,
          expiredQuantity,
          minimumStock: settings.minimumStock,
          reorderLevel: settings.reorderLevel,
          maximumStock: settings.maximumStock,
          reorderQuantity: settings.reorderQuantity,
          safetyStock: settings.safetyStock,
          recommendedQuantity: recommendedReplenishmentQuantity(
            settings,
            position.saleableAvailable
          ),
          status,
          configurationMissing: !hasConfiguredThresholds(settings),
          openAdviceId: active?.id ?? null,
        });
      }
    }
    return {
      totalItems: rows.length,
      healthy: rows.filter((row) => row.status === INVENTORY_CONTROL_STATUSES.HEALTHY).length,
      lowStock: rows.filter((row) => row.status === INVENTORY_CONTROL_STATUSES.LOW_STOCK).length,
      reorderRequired: rows.filter(
        (row) => row.status === INVENTORY_CONTROL_STATUSES.REORDER_REQUIRED
      ).length,
      outOfStock: rows.filter((row) => row.status === INVENTORY_CONTROL_STATUSES.OUT_OF_STOCK)
        .length,
      overstock: rows.filter((row) => row.status === INVENTORY_CONTROL_STATUSES.OVERSTOCK).length,
      configurationMissing: rows.filter((row) => row.configurationMissing).length,
      rows,
      pendingChanges: changes.filter(
        (row) => row.status === INVENTORY_CONTROL_CHANGE_STATUSES.APPROVAL_PENDING
      ),
      openAdvice: advice.filter(
        (row) =>
          row.status === INVENTORY_ADVICE_STATUSES.OPEN ||
          row.status === INVENTORY_ADVICE_STATUSES.ACKNOWLEDGED
      ),
    };
  }

  async syncReplenishmentAdvice(
    context: CurrentBusinessContext,
    idempotencyKey?: string | null
  ) {
    const businessId = context.businessId;
    const key = idempotencyKey
      ? `${INVENTORY_IDEMPOTENCY_OPERATIONS.SYNC_REPLENISHMENT_ADVICE}:${idempotencyKey}`
      : null;
    return this.deps.locks.runExclusive(lockKey(businessId), async () => {
      if (key) {
        const existing = await this.deps.idempotency.find(
          businessId,
          INVENTORY_IDEMPOTENCY_OPERATIONS.SYNC_REPLENISHMENT_ADVICE,
          key
        );
        if (existing) {
          return this.evaluateStockControls(context);
        }
      }
      const dashboard = await this.evaluateStockControls(context);
      for (const row of dashboard.rows) {
        const needsAdvice =
          row.status === INVENTORY_CONTROL_STATUSES.REORDER_REQUIRED ||
          (row.status === INVENTORY_CONTROL_STATUSES.OUT_OF_STOCK && Boolean(row.reorderLevel));
        if (!needsAdvice) {
          continue;
        }
        const existing = await this.deps.advice.findActive(
          businessId,
          row.stockItemId,
          row.locationId,
          INVENTORY_CONTROL_STATUSES.REORDER_REQUIRED
        );
        const snapshot = {
          onHand: row.onHand,
          reserved: row.reserved,
          available: row.available,
          saleableAvailable: row.saleableAvailable,
          thresholdQuantity: row.reorderLevel,
          recommendedQuantity: row.recommendedQuantity,
        };
        if (existing) {
          await this.deps.advice.update(businessId, existing.id, {
            ...snapshot,
            updatedBy: actorId(context),
          });
          continue;
        }
        const allocated = await this.deps.numbering.allocate({
          businessId,
          documentType: "STOCK_CONTROL_ADVICE",
        });
        const created = await this.deps.advice.insert({
          businessId,
          stockItemId: row.stockItemId,
          locationId: row.locationId,
          adviceNumber: allocated.number,
          conditionCode: INVENTORY_CONTROL_STATUSES.REORDER_REQUIRED,
          status: INVENTORY_ADVICE_STATUSES.OPEN,
          ...snapshot,
          reason: null,
          acknowledgedBy: null,
          closedBy: null,
          createdBy: actorId(context),
          updatedBy: actorId(context),
        });
        await this.deps.audit.record({
          businessId,
          actorUserId: actorId(context),
          entityName: "inventory_replenishment_advice",
          entityId: created.id,
          action: INVENTORY_AUDIT_ACTIONS.REPLENISHMENT_ADVICE_CREATED,
          outcome: "SUCCESS",
          references: {
            stockItemId: row.stockItemId,
            locationId: row.locationId,
            available: row.saleableAvailable,
            threshold: row.reorderLevel,
            recommendedQuantity: row.recommendedQuantity,
          },
        });
        await this.deps.audit.record({
          businessId,
          actorUserId: actorId(context),
          entityName: "inventory_replenishment_advice",
          entityId: created.id,
          action: INVENTORY_AUDIT_ACTIONS.REPLENISHMENT_CONDITION_DETECTED,
          outcome: "SUCCESS",
          references: {
            stockItemId: row.stockItemId,
            locationId: row.locationId,
            status: row.status,
          },
        });
      }
      if (key) {
        await this.deps.idempotency.insert({
          businessId,
          operationType: INVENTORY_IDEMPOTENCY_OPERATIONS.SYNC_REPLENISHMENT_ADVICE,
          idempotencyKey: key,
          resourceType: "inventory_replenishment_advice",
          resourceId: businessId,
          createdBy: actorId(context),
        });
      }
      return this.evaluateStockControls(context);
    });
  }

  async acknowledgeAdvice(context: CurrentBusinessContext, adviceId: string) {
    return this.transitionAdvice(context, adviceId, INVENTORY_ADVICE_STATUSES.ACKNOWLEDGED);
  }

  async closeAdvice(context: CurrentBusinessContext, adviceId: string, reason?: string | null) {
    return this.transitionAdvice(context, adviceId, INVENTORY_ADVICE_STATUSES.CLOSED, reason);
  }

  async getAdvice(context: CurrentBusinessContext, adviceId: string) {
    const row = await this.deps.advice.findById(context.businessId, adviceId);
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.ADVICE_NOT_FOUND, undefined, 404);
    }
    return row;
  }

  async getControlChange(context: CurrentBusinessContext, changeId: string) {
    const row = await this.deps.changes.findById(context.businessId, changeId);
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.CONTROL_CHANGE_NOT_FOUND, undefined, 404);
    }
    return row;
  }

  private async transitionAdvice(
    context: CurrentBusinessContext,
    adviceId: string,
    nextStatus: string,
    reason?: string | null
  ) {
    const businessId = context.businessId;
    return this.deps.locks.runExclusive(lockKey(businessId), async () => {
      const current = await this.deps.advice.findById(businessId, adviceId);
      if (!current) {
        throw new InventoryError(INVENTORY_ERROR_CODES.ADVICE_NOT_FOUND, undefined, 404);
      }
      if (current.status === INVENTORY_ADVICE_STATUSES.CLOSED) {
        throw new InventoryError(INVENTORY_ERROR_CODES.ADVICE_NOT_ACTIONABLE);
      }
      const patch =
        nextStatus === INVENTORY_ADVICE_STATUSES.ACKNOWLEDGED
          ? {
              status: nextStatus,
              acknowledgedAt: new Date(),
              acknowledgedBy: actorId(context),
              updatedBy: actorId(context),
            }
          : {
              status: nextStatus,
              reason: reason ?? current.reason,
              closedAt: new Date(),
              closedBy: actorId(context),
              updatedBy: actorId(context),
            };
      const updated = await this.deps.advice.update(businessId, current.id, patch);
      await this.deps.audit.record({
        businessId,
        actorUserId: actorId(context),
        entityName: "inventory_replenishment_advice",
        entityId: current.id,
        action:
          nextStatus === INVENTORY_ADVICE_STATUSES.ACKNOWLEDGED
            ? INVENTORY_AUDIT_ACTIONS.REPLENISHMENT_ADVICE_ACKNOWLEDGED
            : INVENTORY_AUDIT_ACTIONS.REPLENISHMENT_ADVICE_CLOSED,
        outcome: "SUCCESS",
        references: {
          stockItemId: current.stockItemId,
          locationId: current.locationId,
          recommendedQuantity: current.recommendedQuantity,
        },
      });
      return updated;
    });
  }

  private async applySettings(
    businessId: string,
    item: StockItemRecord,
    locationId: string | null,
    settings: InventoryControlSettings,
    actor: string | null
  ) {
    if (locationId) {
      const config = await this.deps.itemLocations.findByItemAndLocation(
        businessId,
        item.id,
        locationId
      );
      if (!config) {
        throw new InventoryError(INVENTORY_ERROR_CODES.STOCK_ITEM_LOCATION_NOT_FOUND, undefined, 404);
      }
      await this.deps.itemLocations.update(businessId, config.id, {
        reorderLevelOverride: settings.reorderLevel,
        minimumStockLevelOverride: settings.minimumStock,
        maximumStockLevelOverride: settings.maximumStock,
        reorderQuantityOverride: settings.reorderQuantity,
        safetyStockOverride: settings.safetyStock,
        updatedBy: actor,
      });
      return;
    }
    await this.deps.stockItems.update(businessId, item.id, {
      reorderLevel: settings.reorderLevel,
      reorderQuantity: settings.reorderQuantity,
      minimumStockLevel: settings.minimumStock,
      maximumStockLevel: settings.maximumStock,
      safetyStock: settings.safetyStock,
      leadTimeDays: settings.leadTimeDays,
      reviewPeriodDays: settings.reviewPeriodDays,
      updatedBy: actor,
    });
  }

  private async currentSettings(
    businessId: string,
    item: StockItemRecord,
    locationId?: string | null
  ) {
    const config = locationId
      ? await this.deps.itemLocations.findByItemAndLocation(businessId, item.id, locationId)
      : null;
    const settings = resolveEffectiveSettings({ item, location: config });
    return { settings, configured: hasConfiguredThresholds(settings) };
  }

  private async expiredQuantity(
    context: CurrentBusinessContext,
    item: StockItemRecord,
    locationId: string
  ) {
    if (!item.expiryTrackingEnabled || !this.deps.traceability) {
      return "0";
    }
    const result = await this.deps.traceability.search(context, {
      stockItemId: item.id,
      locationId,
      expiryStatus: INVENTORY_EXPIRY_STATUSES.EXPIRED,
    });
    return result.lots.reduce(
      (total, lot) => applyInboundQuantity(total, lot.quantity),
      "0"
    );
  }

  private assertChecker(submittedBy: string | null, checkerId: string | null) {
    try {
      this.deps.workflow.assertDistinctActors(
        submittedBy ?? "",
        checkerId ?? "",
        "The person who submitted this change cannot approve it."
      );
    } catch (error) {
      if (
        error instanceof WorkflowEngineError &&
        error.code === WORKFLOW_ENGINE_ERROR_CODES.SELF_APPROVAL
      ) {
        throw new InventoryError(INVENTORY_ERROR_CODES.SELF_APPROVAL);
      }
      throw error;
    }
  }

  private async requireItem(businessId: string, stockItemId: string) {
    const item = await this.deps.stockItems.findById(businessId, stockItemId);
    if (!item) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCK_ITEM_NOT_FOUND, undefined, 404);
    }
    return item;
  }
}

export function createDefaultInventoryControlDependencies(): InventoryControlServiceDependencies {
  const controls = createInventoryOperationControlRepository();
  return {
    products: createProductCatalogueAdapter(),
    stockItems: createStockItemRepository(),
    locations: createInventoryLocationRepository(),
    itemLocations: createStockItemLocationRepository(),
    balances: createInventoryBalanceRepository(),
    advice: createInventoryReplenishmentAdviceRepository(),
    changes: createInventoryControlChangeRepository(),
    controls,
    workflow: createInventoryControlWorkflowAdapter(controls),
    numbering: new ConfigurableDocumentNumberingService(
      createDocumentNumberingPolicyRepository()
    ),
    idempotency: createInventoryIdempotencyRepository(),
    locks: createInProcessInventoryLock(),
    audit: createInventoryAuditAdapter(),
    traceability: createTraceabilityService(),
    opsIncidents: createInventoryOpsIncidentService(),
  };
}

export function createInventoryControlService(deps?: InventoryControlServiceDependencies) {
  return new InventoryControlService(deps ?? createDefaultInventoryControlDependencies());
}
