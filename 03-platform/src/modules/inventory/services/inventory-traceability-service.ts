/**
 * Purpose:
 * Lot and tracked-unit identity linked to the inventory ledger.
 * Does not store an independent on-hand balance.
 *
 * Implementation Package:
 * BP-008 / IP-07 – Batch, Expiry & Serial Resource Tracking
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  applyInboundQuantity,
  compareInventoryQuantity,
  subtractInventoryQuantity,
} from "@/core/inventory-engine";
import {
  INVENTORY_AUDIT_ACTIONS,
  INVENTORY_EXPIRY_STATUSES,
  INVENTORY_LOT_STATUSES,
  INVENTORY_TRACKED_UNIT_STATUSES,
  INVENTORY_TRACKING_MODES,
  INVENTORY_OPS_INCIDENT_TYPES,
} from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryAuditPort,
  InventoryLineTraceRepositoryPort,
  InventoryLocationRepositoryPort,
  InventoryLockPort,
  InventoryLotRepositoryPort,
  InventoryOpsIncidentPort,
  InventoryMovementRepositoryPort,
  InventoryTraceabilityPort,
  InventoryTraceAllocationRepositoryPort,
  InventoryTraceApplyInput,
  InventoryTrackedUnitRepositoryPort,
  StockItemRepositoryPort,
} from "@/modules/inventory/ports";
import {
  createInventoryLineTraceRepository,
  createInventoryLotRepository,
  createInventoryTraceAllocationRepository,
  createInventoryTrackedUnitRepository,
} from "@/modules/inventory/repositories/inventory-traceability-repository";
import { createInventoryLocationRepository } from "@/modules/inventory/repositories/inventory-location-repository";
import { createInventoryMovementRepository } from "@/modules/inventory/repositories/inventory-movement-repository";
import { createStockItemRepository } from "@/modules/inventory/repositories/stock-item-repository";
import { createInventoryAuditAdapter } from "@/modules/inventory/services/inventory-audit-helper";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import { recordDetectedOpsIncident } from "@/modules/inventory/services/inventory-ops-incident-hook";
import { createInventoryOpsIncidentService } from "@/modules/inventory/services/inventory-ops-incident-service";
import {
  assertInboundTrace,
  assertOutboundTrace,
  captureFromCommand,
  classifyExpiryStatus,
  hasTraceCapture,
  normalizeTraceCode,
  normalizeTraceCodeList,
  trackingModeOf,
} from "@/modules/inventory/services/inventory-traceability-rules";
import { normalizeOptionalText as normalizeText } from "@/modules/inventory/services/stock-item-rules";
import type {
  InventoryLineTraceRecord,
  InventoryLotRecord,
  InventoryLotView,
  InventoryTraceAllocationRecord,
  InventoryTraceCapture,
  InventoryTraceEventView,
  InventoryTraceabilitySearchQuery,
  InventoryTrackedUnitRecord,
  InventoryTrackedUnitView,
  StockItemRecord,
} from "@/modules/inventory/types";

export type TraceabilityServiceDependencies = {
  stockItems: StockItemRepositoryPort;
  locations: InventoryLocationRepositoryPort;
  movements: InventoryMovementRepositoryPort;
  lots: InventoryLotRepositoryPort;
  units: InventoryTrackedUnitRepositoryPort;
  captures: InventoryLineTraceRepositoryPort;
  allocations: InventoryTraceAllocationRepositoryPort;
  locks: InventoryLockPort;
  audit: InventoryAuditPort;
  opsIncidents?: InventoryOpsIncidentPort;
};

function actorId(context: CurrentBusinessContext): string | null {
  return context.platformUserId || null;
}

function lotLockKey(businessId: string, stockItemId: string, lotCode: string) {
  return `${businessId}:lot:${stockItemId}:${lotCode}`;
}

function unitLockKey(businessId: string, unitCode: string) {
  return `${businessId}:tracked-unit:${unitCode}`;
}

function requireModePort(mode: string, port: InventoryTraceabilityPort | null | undefined) {
  if (mode === INVENTORY_TRACKING_MODES.NONE) {
    return;
  }
  if (!port) {
    throw new InventoryError(INVENTORY_ERROR_CODES.TRACKING_REQUIRED);
  }
}

export { requireModePort, captureFromCommand };

export class TraceabilityService implements InventoryTraceabilityPort {
  constructor(private readonly deps: TraceabilityServiceDependencies) {}

  async captureLine(
    context: CurrentBusinessContext,
    input: {
      sourceType: string;
      sourceId: string;
      sourceLineId: string;
      stockItem: StockItemRecord;
      capture: InventoryTraceCapture | null | undefined;
      baseQuantity: string;
      direction: "IN" | "OUT" | "RESERVE";
    }
  ): Promise<InventoryLineTraceRecord | null> {
    const businessId = context.businessId;
    const mode = trackingModeOf(input.stockItem);
    if (input.direction === "OUT" || input.direction === "RESERVE") {
      assertOutboundTrace({
        mode,
        capture: input.capture,
        baseQuantity: input.baseQuantity,
      });
    } else {
      assertInboundTrace({
        mode,
        expiryRequired: Boolean(input.stockItem.expiryTrackingEnabled),
        capture: input.capture,
        baseQuantity: input.baseQuantity,
      });
    }
    if (mode === INVENTORY_TRACKING_MODES.NONE) {
      return null;
    }
    const existing = await this.deps.captures.findBySourceLine(
      businessId,
      input.sourceType,
      input.sourceLineId
    );
    if (existing) {
      return existing;
    }
    const lotCode =
      mode === INVENTORY_TRACKING_MODES.BATCH
        ? normalizeTraceCode(input.capture?.lotCode, "lotCode")
        : null;
    const unitCodes =
      mode === INVENTORY_TRACKING_MODES.SERIAL
        ? normalizeTraceCodeList(input.capture?.unitCodes ?? [])
        : null;
    return this.deps.captures.insert({
      businessId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceLineId: input.sourceLineId,
      stockItemId: input.stockItem.id,
      lotCode,
      manufacturedOn: normalizeText(input.capture?.manufacturedOn),
      expiresOn: normalizeText(input.capture?.expiresOn),
      unitCodes,
      createdBy: actorId(context),
    });
  }

  async getCapture(
    context: CurrentBusinessContext,
    sourceType: string,
    sourceLineId: string
  ): Promise<InventoryTraceCapture | null> {
    const stored = await this.deps.captures.findBySourceLine(
      context.businessId,
      sourceType,
      sourceLineId
    );
    if (!stored) {
      return null;
    }
    return {
      lotCode: stored.lotCode,
      manufacturedOn: stored.manufacturedOn,
      expiresOn: stored.expiresOn,
      unitCodes: stored.unitCodes,
    };
  }

  async applyInbound(input: InventoryTraceApplyInput): Promise<void> {
    const businessId = input.context.businessId;
    const mode = trackingModeOf(input.stockItem);
    if (mode === INVENTORY_TRACKING_MODES.NONE) {
      if (hasTraceCapture(input.capture)) {
        throw new InventoryError(INVENTORY_ERROR_CODES.TRACKING_NOT_ALLOWED);
      }
      return;
    }
    const existing = await this.deps.allocations.listByMovement(businessId, input.movementId);
    if (existing.length > 0) {
      return;
    }
    const capture = await this.resolveCapture(businessId, input);
    if (mode === INVENTORY_TRACKING_MODES.BATCH) {
      const lotCode = normalizeTraceCode(capture?.lotCode, "lotCode");
      await this.deps.locks.runExclusive(
        lotLockKey(businessId, input.stockItem.id, lotCode),
        async () => {
          const { lot, created } = await this.requireOrCreateLot(
            input.context,
            input.stockItem,
            capture
          );
          await this.deps.allocations.insert({
            businessId,
            movementId: input.movementId,
            stockItemId: input.stockItem.id,
            locationId: input.locationId,
            lotId: lot.id,
            trackedUnitId: null,
            direction: "IN",
            quantity: input.baseQuantity,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            sourceLineId: input.sourceLineId,
            createdBy: actorId(input.context),
          });
          await this.deps.audit.record({
            businessId,
            actorUserId: actorId(input.context),
            entityName: "inventory_lot",
            entityId: lot.id,
            action: created
              ? INVENTORY_AUDIT_ACTIONS.LOT_CREATED
              : INVENTORY_AUDIT_ACTIONS.LOT_UPDATED,
            outcome: "SUCCESS",
            references: {
              stockItemId: input.stockItem.id,
              locationId: input.locationId,
              lotCode: lot.lotCode,
              quantity: input.baseQuantity,
              sourceType: input.sourceType,
              sourceId: input.sourceId,
            },
          });
        }
      );
      return;
    }
    const codes = normalizeTraceCodeList(capture?.unitCodes ?? []);
    const status = input.unitStatus ?? INVENTORY_TRACKED_UNIT_STATUSES.AVAILABLE;
    for (const code of codes) {
      await this.deps.locks.runExclusive(unitLockKey(businessId, code), async () => {
        const current = await this.deps.units.findByCode(businessId, code);
        let unit: InventoryTrackedUnitRecord;
        if (current) {
          if (
            current.status !== INVENTORY_TRACKED_UNIT_STATUSES.SOLD &&
            current.status !== INVENTORY_TRACKED_UNIT_STATUSES.RETURNED
          ) {
            await recordDetectedOpsIncident(this.deps.opsIncidents, input.context, {
              incidentType: INVENTORY_OPS_INCIDENT_TYPES.SERIAL_EXCEPTION,
              severity: "HIGH",
              sourceType: input.sourceType,
              sourceId: input.sourceId,
              stockItemId: input.stockItem.id,
              locationId: input.locationId,
              description: "This serial is already recorded for this business.",
              idempotencyKey: `serial-exception:${code}`,
            });
            throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_TRACKED_UNIT, undefined, 409);
          }
          if (current.stockItemId !== input.stockItem.id) {
            await recordDetectedOpsIncident(this.deps.opsIncidents, input.context, {
              incidentType: INVENTORY_OPS_INCIDENT_TYPES.SERIAL_EXCEPTION,
              severity: "HIGH",
              sourceType: input.sourceType,
              sourceId: input.sourceId,
              stockItemId: input.stockItem.id,
              locationId: input.locationId,
              description: "This serial is already recorded for this business.",
              idempotencyKey: `serial-exception:${code}`,
            });
            throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_TRACKED_UNIT, undefined, 409);
          }
          unit = await this.deps.units.update(businessId, current.id, {
            status,
            locationId: input.locationId,
            expiresOn: normalizeText(capture?.expiresOn) ?? current.expiresOn,
            heldSourceType: null,
            heldSourceId: null,
            updatedBy: actorId(input.context),
          });
        } else {
          unit = await this.deps.units.insert({
            businessId,
            stockItemId: input.stockItem.id,
            unitCode: code,
            status,
            locationId: input.locationId,
            expiresOn: normalizeText(capture?.expiresOn),
            heldSourceType: null,
            heldSourceId: null,
            notes: null,
            createdBy: actorId(input.context),
            updatedBy: actorId(input.context),
          });
        }
        await this.deps.allocations.insert({
          businessId,
          movementId: input.movementId,
          stockItemId: input.stockItem.id,
          locationId: input.locationId,
          lotId: null,
          trackedUnitId: unit.id,
          direction: "IN",
          quantity: "1",
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          sourceLineId: input.sourceLineId,
          createdBy: actorId(input.context),
        });
        await this.deps.audit.record({
          businessId,
          actorUserId: actorId(input.context),
          entityName: "inventory_tracked_unit",
          entityId: unit.id,
          action: current
            ? INVENTORY_AUDIT_ACTIONS.TRACKED_UNIT_ASSIGNED
            : INVENTORY_AUDIT_ACTIONS.TRACKED_UNIT_CREATED,
          outcome: "SUCCESS",
          references: {
            stockItemId: input.stockItem.id,
            locationId: input.locationId,
            unitCode: unit.unitCode,
            quantity: "1",
            sourceType: input.sourceType,
            sourceId: input.sourceId,
          },
        });
      });
    }
  }

  async applyOutbound(input: InventoryTraceApplyInput): Promise<void> {
    const businessId = input.context.businessId;
    const mode = trackingModeOf(input.stockItem);
    if (mode === INVENTORY_TRACKING_MODES.NONE) {
      if (hasTraceCapture(input.capture)) {
        throw new InventoryError(INVENTORY_ERROR_CODES.TRACKING_NOT_ALLOWED);
      }
      return;
    }
    const existing = await this.deps.allocations.listByMovement(businessId, input.movementId);
    if (existing.length > 0) {
      return;
    }
    const capture = await this.resolveCapture(businessId, input);
    if (mode === INVENTORY_TRACKING_MODES.BATCH) {
      const lotCode = normalizeTraceCode(capture?.lotCode, "lotCode");
      await this.deps.locks.runExclusive(
        lotLockKey(businessId, input.stockItem.id, lotCode),
        async () => {
          const lot = await this.deps.lots.findByCode(businessId, input.stockItem.id, lotCode);
          if (!lot) {
            throw new InventoryError(INVENTORY_ERROR_CODES.LOT_NOT_FOUND, undefined, 404);
          }
          this.assertExpiryAllowed(input.stockItem, lot.expiresOn, input.enforceExpiry !== false);
          const remaining = await this.lotQuantityAt(
            businessId,
            lot.id,
            input.locationId
          );
          if (compareInventoryQuantity(remaining, input.baseQuantity) < 0) {
            throw new InventoryError(INVENTORY_ERROR_CODES.INSUFFICIENT_LOT_QUANTITY);
          }
          await this.deps.allocations.insert({
            businessId,
            movementId: input.movementId,
            stockItemId: input.stockItem.id,
            locationId: input.locationId,
            lotId: lot.id,
            trackedUnitId: null,
            direction: "OUT",
            quantity: input.baseQuantity,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            sourceLineId: input.sourceLineId,
            createdBy: actorId(input.context),
          });
        }
      );
      return;
    }
    const codes = normalizeTraceCodeList(capture?.unitCodes ?? []);
    const nextStatus = input.unitStatus ?? INVENTORY_TRACKED_UNIT_STATUSES.SOLD;
    for (const code of codes) {
      await this.deps.locks.runExclusive(unitLockKey(businessId, code), async () => {
        const unit = await this.deps.units.findByCode(businessId, code);
        if (!unit || unit.stockItemId !== input.stockItem.id) {
          throw new InventoryError(INVENTORY_ERROR_CODES.TRACKED_UNIT_NOT_FOUND, undefined, 404);
        }
        const heldByThis =
          unit.status === INVENTORY_TRACKED_UNIT_STATUSES.RESERVED &&
          Boolean(input.reservationId) &&
          unit.heldSourceId === input.reservationId;
        if (
          unit.status !== INVENTORY_TRACKED_UNIT_STATUSES.AVAILABLE &&
          !heldByThis
        ) {
          throw new InventoryError(INVENTORY_ERROR_CODES.TRACKED_UNIT_NOT_AVAILABLE);
        }
        if (unit.locationId && unit.locationId !== input.locationId) {
          throw new InventoryError(INVENTORY_ERROR_CODES.TRACKED_UNIT_NOT_AVAILABLE);
        }
        this.assertExpiryAllowed(input.stockItem, unit.expiresOn, input.enforceExpiry !== false);
        await this.deps.units.update(businessId, unit.id, {
          status: nextStatus,
          locationId:
            nextStatus === INVENTORY_TRACKED_UNIT_STATUSES.SOLD ||
            nextStatus === INVENTORY_TRACKED_UNIT_STATUSES.LOST ||
            nextStatus === INVENTORY_TRACKED_UNIT_STATUSES.DAMAGED ||
            nextStatus === INVENTORY_TRACKED_UNIT_STATUSES.RETURNED
              ? null
              : input.locationId,
          heldSourceType: null,
          heldSourceId: null,
          updatedBy: actorId(input.context),
        });
        await this.deps.allocations.insert({
          businessId,
          movementId: input.movementId,
          stockItemId: input.stockItem.id,
          locationId: input.locationId,
          lotId: null,
          trackedUnitId: unit.id,
          direction: "OUT",
          quantity: "1",
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          sourceLineId: input.sourceLineId,
          createdBy: actorId(input.context),
        });
        await this.deps.audit.record({
          businessId,
          actorUserId: actorId(input.context),
          entityName: "inventory_tracked_unit",
          entityId: unit.id,
          action:
            nextStatus === INVENTORY_TRACKED_UNIT_STATUSES.SOLD
              ? INVENTORY_AUDIT_ACTIONS.TRACKED_UNIT_SOLD
              : INVENTORY_AUDIT_ACTIONS.TRACKED_UNIT_ADJUSTED,
          outcome: "SUCCESS",
          references: {
            stockItemId: input.stockItem.id,
            locationId: input.locationId,
            unitCode: unit.unitCode,
            quantity: "1",
            sourceType: input.sourceType,
            sourceId: input.sourceId,
          },
        });
      });
    }
  }

  async reserveUnits(input: {
    context: CurrentBusinessContext;
    stockItem: StockItemRecord;
    locationId: string;
    sourceType: string;
    sourceId: string;
    sourceLineId: string;
    capture: InventoryTraceCapture | null | undefined;
    baseQuantity: string;
  }): Promise<void> {
    const businessId = input.context.businessId;
    const mode = trackingModeOf(input.stockItem);
    if (mode === INVENTORY_TRACKING_MODES.NONE) {
      if (hasTraceCapture(input.capture)) {
        throw new InventoryError(INVENTORY_ERROR_CODES.TRACKING_NOT_ALLOWED);
      }
      return;
    }
    const stored = await this.deps.captures.findBySourceLine(
      businessId,
      input.sourceType,
      input.sourceLineId
    );
    const capture = hasTraceCapture(input.capture)
      ? input.capture
      : stored
        ? {
            lotCode: stored.lotCode,
            manufacturedOn: stored.manufacturedOn,
            expiresOn: stored.expiresOn,
            unitCodes: stored.unitCodes,
          }
        : input.capture;
    await this.captureLine(input.context, {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceLineId: input.sourceLineId,
      stockItem: input.stockItem,
      capture,
      baseQuantity: input.baseQuantity,
      direction: "RESERVE",
    });
    if (mode === INVENTORY_TRACKING_MODES.BATCH) {
      const lotCode = normalizeTraceCode(capture?.lotCode, "lotCode");
      await this.deps.locks.runExclusive(
        lotLockKey(businessId, input.stockItem.id, lotCode),
        async () => {
          const lot = await this.deps.lots.findByCode(businessId, input.stockItem.id, lotCode);
          if (!lot) {
            throw new InventoryError(INVENTORY_ERROR_CODES.LOT_NOT_FOUND, undefined, 404);
          }
          this.assertExpiryAllowed(input.stockItem, lot.expiresOn, true);
          const remaining = await this.lotQuantityAt(businessId, lot.id, input.locationId);
          if (compareInventoryQuantity(remaining, input.baseQuantity) < 0) {
            throw new InventoryError(INVENTORY_ERROR_CODES.INSUFFICIENT_LOT_QUANTITY);
          }
        }
      );
      return;
    }
    const codes = normalizeTraceCodeList(capture?.unitCodes ?? []);
    for (const code of codes) {
      await this.deps.locks.runExclusive(unitLockKey(businessId, code), async () => {
        const unit = await this.deps.units.findByCode(businessId, code);
        if (!unit || unit.stockItemId !== input.stockItem.id) {
          throw new InventoryError(INVENTORY_ERROR_CODES.TRACKED_UNIT_NOT_FOUND, undefined, 404);
        }
        if (unit.status !== INVENTORY_TRACKED_UNIT_STATUSES.AVAILABLE) {
          throw new InventoryError(INVENTORY_ERROR_CODES.TRACKED_UNIT_CONFLICT);
        }
        if (unit.locationId && unit.locationId !== input.locationId) {
          throw new InventoryError(INVENTORY_ERROR_CODES.TRACKED_UNIT_NOT_AVAILABLE);
        }
        this.assertExpiryAllowed(input.stockItem, unit.expiresOn, true);
        await this.deps.units.update(businessId, unit.id, {
          status: INVENTORY_TRACKED_UNIT_STATUSES.RESERVED,
          locationId: input.locationId,
          heldSourceType: input.sourceType,
          heldSourceId: input.sourceId,
          updatedBy: actorId(input.context),
        });
        await this.deps.audit.record({
          businessId,
          actorUserId: actorId(input.context),
          entityName: "inventory_tracked_unit",
          entityId: unit.id,
          action: INVENTORY_AUDIT_ACTIONS.TRACKED_UNIT_RESERVED,
          outcome: "SUCCESS",
          references: {
            stockItemId: input.stockItem.id,
            locationId: input.locationId,
            unitCode: unit.unitCode,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
          },
        });
      });
    }
  }

  async releaseUnits(input: {
    context: CurrentBusinessContext;
    stockItem: StockItemRecord;
    sourceId: string;
  }): Promise<void> {
    const businessId = input.context.businessId;
    if (trackingModeOf(input.stockItem) !== INVENTORY_TRACKING_MODES.SERIAL) {
      return;
    }
    const units = await this.deps.units.listByItem(businessId, input.stockItem.id);
    for (const unit of units) {
      if (unit.heldSourceId !== input.sourceId) {
        continue;
      }
      await this.deps.locks.runExclusive(unitLockKey(businessId, unit.unitCode), async () => {
        const current = await this.deps.units.findById(businessId, unit.id);
        if (!current || current.heldSourceId !== input.sourceId) {
          return;
        }
        await this.deps.units.update(businessId, current.id, {
          status: INVENTORY_TRACKED_UNIT_STATUSES.AVAILABLE,
          heldSourceType: null,
          heldSourceId: null,
          updatedBy: actorId(input.context),
        });
        await this.deps.audit.record({
          businessId,
          actorUserId: actorId(input.context),
          entityName: "inventory_tracked_unit",
          entityId: current.id,
          action: INVENTORY_AUDIT_ACTIONS.TRACKED_UNIT_RELEASED,
          outcome: "SUCCESS",
          references: {
            stockItemId: input.stockItem.id,
            unitCode: current.unitCode,
            sourceId: input.sourceId,
          },
        });
      });
    }
  }

  async search(context: CurrentBusinessContext, query: InventoryTraceabilitySearchQuery) {
    const businessId = context.businessId;
    const lots = await this.deps.lots.listByBusiness(businessId);
    const units = await this.deps.units.listByBusiness(businessId);
    const lotViews: InventoryLotView[] = [];
    for (const lot of lots) {
      if (query.stockItemId && lot.stockItemId !== query.stockItemId) {
        continue;
      }
      if (query.lotCode && lot.lotCode !== normalizeText(query.lotCode)?.toUpperCase()) {
        continue;
      }
      const expiryStatus = classifyExpiryStatus(lot.expiresOn);
      if (query.expiryStatus && expiryStatus !== query.expiryStatus) {
        continue;
      }
      const item = await this.deps.stockItems.findById(businessId, lot.stockItemId);
      const allocations = await this.deps.allocations.listByLot(businessId, lot.id);
      const byLocation = new Map<string, string>();
      for (const row of allocations) {
        const signed =
          row.direction === "IN"
            ? row.quantity
            : subtractInventoryQuantity("0", row.quantity);
        byLocation.set(
          row.locationId,
          applyInboundQuantity(byLocation.get(row.locationId) ?? "0", signed)
        );
      }
      const entries = byLocation.size > 0 ? [...byLocation.entries()] : [["", "0"] as const];
      for (const [locationId, quantity] of entries) {
        if (query.locationId && locationId !== query.locationId) {
          continue;
        }
        const location = locationId
          ? await this.deps.locations.findById(businessId, locationId)
          : null;
        lotViews.push({
          id: lot.id,
          lotCode: lot.lotCode,
          stockItemId: lot.stockItemId,
          sku: item?.sku ?? "",
          locationId: locationId || null,
          locationName: location?.name ?? null,
          quantity,
          expiresOn: lot.expiresOn,
          expiryStatus,
          status: lot.status,
        });
      }
    }
    const unitViews: InventoryTrackedUnitView[] = [];
    for (const unit of units) {
      if (query.stockItemId && unit.stockItemId !== query.stockItemId) {
        continue;
      }
      if (query.unitCode && unit.unitCode !== normalizeText(query.unitCode)?.toUpperCase()) {
        continue;
      }
      if (query.locationId && unit.locationId !== query.locationId) {
        continue;
      }
      const expiryStatus = classifyExpiryStatus(unit.expiresOn);
      if (query.expiryStatus && expiryStatus !== query.expiryStatus) {
        continue;
      }
      unitViews.push(await this.toUnitView(businessId, unit));
    }
    return { lots: lotViews, units: unitViews };
  }

  async getLotDetail(context: CurrentBusinessContext, lotId: string) {
    const businessId = context.businessId;
    const lot = await this.deps.lots.findById(businessId, lotId);
    if (!lot) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LOT_NOT_FOUND, undefined, 404);
    }
    const item = await this.deps.stockItems.findById(businessId, lot.stockItemId);
    const allocations = await this.deps.allocations.listByLot(businessId, lot.id);
    const quantity = allocations.reduce((total, row) => {
      return row.direction === "IN"
        ? applyInboundQuantity(total, row.quantity)
        : subtractInventoryQuantity(total, row.quantity);
    }, "0");
    const firstLocation = allocations[0]?.locationId ?? null;
    const location = firstLocation
      ? await this.deps.locations.findById(businessId, firstLocation)
      : null;
    return {
      lot: {
        id: lot.id,
        lotCode: lot.lotCode,
        stockItemId: lot.stockItemId,
        sku: item?.sku ?? "",
        locationId: firstLocation,
        locationName: location?.name ?? null,
        quantity,
        expiresOn: lot.expiresOn,
        expiryStatus: classifyExpiryStatus(lot.expiresOn),
        status: lot.status,
      },
      history: await this.historyFromAllocations(businessId, lot.stockItemId, allocations),
    };
  }

  async getUnitDetail(context: CurrentBusinessContext, unitId: string) {
    const businessId = context.businessId;
    const unit = await this.deps.units.findById(businessId, unitId);
    if (!unit) {
      throw new InventoryError(INVENTORY_ERROR_CODES.TRACKED_UNIT_NOT_FOUND, undefined, 404);
    }
    const allocations = await this.deps.allocations.listByTrackedUnit(businessId, unit.id);
    return {
      unit: await this.toUnitView(businessId, unit),
      history: await this.historyFromAllocations(businessId, unit.stockItemId, allocations),
    };
  }

  private async resolveCapture(
    businessId: string,
    input: InventoryTraceApplyInput
  ): Promise<InventoryTraceCapture | null> {
    if (hasTraceCapture(input.capture)) {
      return input.capture ?? null;
    }
    const stored = await this.deps.captures.findBySourceLine(
      businessId,
      input.sourceType,
      input.sourceLineId
    );
    if (stored) {
      return {
        lotCode: stored.lotCode,
        manufacturedOn: stored.manufacturedOn,
        expiresOn: stored.expiresOn,
        unitCodes: stored.unitCodes,
      };
    }
    if (input.reservationId) {
      const reserved = await this.deps.captures.findBySourceLine(
        businessId,
        "STOCK_RESERVATION",
        input.reservationId
      );
      if (reserved) {
        return {
          lotCode: reserved.lotCode,
          manufacturedOn: reserved.manufacturedOn,
          expiresOn: reserved.expiresOn,
          unitCodes: reserved.unitCodes,
        };
      }
    }
    return null;
  }

  private async requireOrCreateLot(
    context: CurrentBusinessContext,
    stockItem: StockItemRecord,
    capture: InventoryTraceCapture | null
  ): Promise<{ lot: InventoryLotRecord; created: boolean }> {
    const lotCode = normalizeTraceCode(capture?.lotCode, "lotCode");
    const existing = await this.deps.lots.findByCode(
      context.businessId,
      stockItem.id,
      lotCode
    );
    if (existing) {
      return { lot: existing, created: false };
    }
    const lot = await this.deps.lots.insert({
      businessId: context.businessId,
      stockItemId: stockItem.id,
      lotCode,
      manufacturedOn: normalizeText(capture?.manufacturedOn),
      expiresOn: normalizeText(capture?.expiresOn),
      status: INVENTORY_LOT_STATUSES.ACTIVE,
      notes: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    return { lot, created: true };
  }

  private async lotQuantityAt(businessId: string, lotId: string, locationId: string) {
    const allocations = await this.deps.allocations.listByLot(businessId, lotId);
    return allocations
      .filter((row) => row.locationId === locationId)
      .reduce((total, row) => {
        return row.direction === "IN"
          ? applyInboundQuantity(total, row.quantity)
          : subtractInventoryQuantity(total, row.quantity);
      }, "0");
  }

  private assertExpiryAllowed(
    stockItem: StockItemRecord,
    expiresOn: string | null,
    enforce: boolean
  ) {
    if (!enforce || stockItem.allowExpiredFulfilment) {
      return;
    }
    if (classifyExpiryStatus(expiresOn) === INVENTORY_EXPIRY_STATUSES.EXPIRED) {
      throw new InventoryError(INVENTORY_ERROR_CODES.EXPIRED_STOCK_NOT_ALLOWED);
    }
  }

  private async toUnitView(
    businessId: string,
    unit: InventoryTrackedUnitRecord
  ): Promise<InventoryTrackedUnitView> {
    const item = await this.deps.stockItems.findById(businessId, unit.stockItemId);
    const location = unit.locationId
      ? await this.deps.locations.findById(businessId, unit.locationId)
      : null;
    const allocations = await this.deps.allocations.listByTrackedUnit(businessId, unit.id);
    return {
      id: unit.id,
      unitCode: unit.unitCode,
      stockItemId: unit.stockItemId,
      sku: item?.sku ?? "",
      locationId: unit.locationId,
      locationName: location?.name ?? null,
      status: unit.status,
      expiresOn: unit.expiresOn,
      expiryStatus: classifyExpiryStatus(unit.expiresOn),
      lastMovementId: allocations[0]?.movementId ?? null,
    };
  }

  private async historyFromAllocations(
    businessId: string,
    stockItemId: string,
    allocations: InventoryTraceAllocationRecord[]
  ): Promise<InventoryTraceEventView[]> {
    const movements = await this.deps.movements.listByStockItem(businessId, stockItemId);
    const movementById = new Map(movements.map((row) => [row.id, row]));
    const events: InventoryTraceEventView[] = [];
    for (const row of [...allocations].sort(
      (left, right) => left.createdAt.getTime() - right.createdAt.getTime()
    )) {
      const movement = movementById.get(row.movementId);
      const location = await this.deps.locations.findById(businessId, row.locationId);
      events.push({
        occurredAt: (movement?.occurredAt ?? row.createdAt).toISOString(),
        movementType: movement?.movementType ?? row.sourceType,
        direction: row.direction,
        quantity: row.quantity,
        locationName: location?.name ?? "",
        sourceType: row.sourceType,
        sourceId: row.sourceId,
      });
    }
    return events;
  }
}

export function createDefaultTraceabilityDependencies(
  locks?: InventoryLockPort
): TraceabilityServiceDependencies {
  return {
    stockItems: createStockItemRepository(),
    locations: createInventoryLocationRepository(),
    movements: createInventoryMovementRepository(),
    lots: createInventoryLotRepository(),
    units: createInventoryTrackedUnitRepository(),
    captures: createInventoryLineTraceRepository(),
    allocations: createInventoryTraceAllocationRepository(),
    locks: locks ?? createInProcessInventoryLock(),
    audit: createInventoryAuditAdapter(),
    opsIncidents: createInventoryOpsIncidentService(),
  };
}

export function createTraceabilityService(deps?: TraceabilityServiceDependencies) {
  return new TraceabilityService(deps ?? createDefaultTraceabilityDependencies());
}
