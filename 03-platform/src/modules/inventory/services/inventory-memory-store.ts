/**
 * Purpose:
 * In-memory inventory catalogues, stock items, locations, movements, and
 * balances for IP-01 smoke tests.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryBalanceRepositoryPort,
  InventoryIdempotencyPort,
  InventoryLocationRepositoryPort,
  InventoryMovementRepositoryPort,
  InventoryOpeningBalanceLineRepositoryPort,
  InventoryOpeningBalanceRepositoryPort,
  InventoryOperationControlPort,
  InventoryProductCataloguePort,
  InventoryReceiptLineRepositoryPort,
  InventoryReceiptRepositoryPort,
  InventoryReservationRepositoryPort,
  InventoryFulfilmentRepositoryPort,
  InventoryAdjustmentRepositoryPort,
  InventoryAdjustmentLineRepositoryPort,
  InventoryStocktakeRepositoryPort,
  InventoryStocktakeLineRepositoryPort,
  InventoryStocktakeCountRepositoryPort,
  InventoryLineTraceRepositoryPort,
  InventoryLotRepositoryPort,
  InventoryTraceAllocationRepositoryPort,
  InventoryTrackedUnitRepositoryPort,
  InventoryReplenishmentAdviceRepositoryPort,
  InventoryControlChangeRepositoryPort,
  InventoryOpsIncidentEventRepositoryPort,
  InventoryOpsIncidentRepositoryPort,
  InventoryOpsIncidentTypeCataloguePort,
  InventoryTransferLineRepositoryPort,
  InventoryTransferRepositoryPort,
  InventorySupplierPort,
  InventoryTypeCataloguePort,
  InventoryUnitCataloguePort,
  StockItemLocationRepositoryPort,
  StockItemRepositoryPort,
} from "@/modules/inventory/ports";
import type {
  CatalogueTypeRef,
  InventoryBalanceInsert,
  InventoryBalanceRecord,
  InventoryIdempotencyInsert,
  InventoryInboundLineInsert,
  InventoryInboundLinePatch,
  InventoryInboundLineRecord,
  InventoryLocationInsert,
  InventoryLocationPatch,
  InventoryLocationRecord,
  InventoryMovementInsert,
  InventoryMovementRecord,
  InventoryOpeningBalanceInsert,
  InventoryOpeningBalancePatch,
  InventoryOpeningBalanceRecord,
  InventoryOperationControl,
  InventoryProductRef,
  InventoryReceiptInsert,
  InventoryReceiptPatch,
  InventoryReceiptRecord,
  InventoryReservationInsert,
  InventoryReservationPatch,
  InventoryReservationRecord,
  InventoryFulfilmentInsert,
  InventoryFulfilmentRecord,
  InventoryAdjustmentInsert,
  InventoryAdjustmentPatch,
  InventoryAdjustmentRecord,
  InventoryAdjustmentLineInsert,
  InventoryAdjustmentLinePatch,
  InventoryAdjustmentLineRecord,
  InventoryStocktakeInsert,
  InventoryStocktakePatch,
  InventoryStocktakeRecord,
  InventoryStocktakeLineInsert,
  InventoryStocktakeLinePatch,
  InventoryStocktakeLineRecord,
  InventoryStocktakeCountInsert,
  InventoryStocktakeCountRecord,
  InventoryLineTraceInsert,
  InventoryLineTraceRecord,
  InventoryLotInsert,
  InventoryLotPatch,
  InventoryLotRecord,
  InventoryTraceAllocationInsert,
  InventoryTraceAllocationRecord,
  InventoryTrackedUnitInsert,
  InventoryReplenishmentAdviceInsert,
  InventoryReplenishmentAdvicePatch,
  InventoryReplenishmentAdviceRecord,
  InventoryControlChangeInsert,
  InventoryControlChangePatch,
  InventoryControlChangeRecord,
  InventoryOpsIncidentEventInsert,
  InventoryOpsIncidentEventRecord,
  InventoryOpsIncidentInsert,
  InventoryOpsIncidentPatch,
  InventoryOpsIncidentRecord,
  InventoryTransferInsert,
  InventoryTransferLineInsert,
  InventoryTransferLinePatch,
  InventoryTransferLineRecord,
  InventoryTransferPatch,
  InventoryTransferRecord,
  InventoryTrackedUnitPatch,
  InventoryTrackedUnitRecord,
  InventorySupplierRef,
  InventoryUnitRef,
  StockItemInsert,
  StockItemLocationInsert,
  StockItemLocationPatch,
  StockItemLocationRecord,
  StockItemPatch,
  StockItemRecord,
} from "@/modules/inventory/types";
import {
  applyInboundQuantity,
  applyOutboundQuantity,
  deriveAvailableQuantity,
  openingStockBalance,
} from "@/core/inventory-engine";
import { INVENTORY_RESERVATION_STATUSES } from "@/modules/inventory/constants";
import { stockItemTypes } from "@/db/seeds/stock-item-types";
import { inventoryLocationTypes } from "@/db/seeds/inventory-location-types";
import { defaultIncidentTypes } from "@/modules/inventory/services/inventory-ops-incident-rules";

function now() {
  return new Date();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function newId() {
  return crypto.randomUUID();
}

function asNumeric(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value);
}

export function defaultInventoryTypeCatalogues(): {
  itemTypes: CatalogueTypeRef[];
  locationTypes: CatalogueTypeRef[];
} {
  return {
    itemTypes: stockItemTypes.map((row) => ({
      code: row.code,
      name: row.name,
      description: row.description,
      isActive: row.isActive,
    })),
    locationTypes: inventoryLocationTypes.map((row) => ({
      code: row.code,
      name: row.name,
      description: row.description,
      isActive: row.isActive,
    })),
  };
}

export class InMemoryInventoryStore {
  readonly products = new Map<string, InventoryProductRef>();
  readonly units = new Map<string, InventoryUnitRef>();
  readonly stockItems = new Map<string, StockItemRecord>();
  readonly locations = new Map<string, InventoryLocationRecord>();
  readonly itemLocations = new Map<string, StockItemLocationRecord>();
  readonly movements = new Map<string, InventoryMovementRecord>();
  readonly balances = new Map<string, InventoryBalanceRecord>();
  readonly receipts = new Map<string, InventoryReceiptRecord>();
  readonly receiptLines = new Map<string, InventoryInboundLineRecord>();
  readonly openings = new Map<string, InventoryOpeningBalanceRecord>();
  readonly openingLines = new Map<string, InventoryInboundLineRecord>();
  readonly reservations = new Map<string, InventoryReservationRecord>();
  readonly fulfilments = new Map<string, InventoryFulfilmentRecord>();
  readonly adjustments = new Map<string, InventoryAdjustmentRecord>();
  readonly adjustmentLines = new Map<string, InventoryAdjustmentLineRecord>();
  readonly stocktakes = new Map<string, InventoryStocktakeRecord>();
  readonly stocktakeLines = new Map<string, InventoryStocktakeLineRecord>();
  readonly stocktakeCounts = new Map<string, InventoryStocktakeCountRecord>();
  readonly lots = new Map<string, InventoryLotRecord>();
  readonly trackedUnits = new Map<string, InventoryTrackedUnitRecord>();
  readonly lineTraces = new Map<string, InventoryLineTraceRecord>();
  readonly traceAllocations = new Map<string, InventoryTraceAllocationRecord>();
  readonly advice = new Map<string, InventoryReplenishmentAdviceRecord>();
  readonly controlChanges = new Map<string, InventoryControlChangeRecord>();
  readonly opsIncidents = new Map<string, InventoryOpsIncidentRecord>();
  readonly opsIncidentEvents = new Map<string, InventoryOpsIncidentEventRecord>();
  readonly transfers = new Map<string, InventoryTransferRecord>();
  readonly transferLines = new Map<string, InventoryTransferLineRecord>();
  readonly idempotency = new Map<string, InventoryIdempotencyInsert & { id: string; createdAt: Date }>();
  readonly suppliers = new Map<string, InventorySupplierRef & { businessId: string }>();
  readonly controls = new Map<string, InventoryOperationControl>();
  itemTypes: CatalogueTypeRef[] = defaultInventoryTypeCatalogues().itemTypes;
  locationTypes: CatalogueTypeRef[] = defaultInventoryTypeCatalogues().locationTypes;
  incidentTypes = defaultIncidentTypes();

  seedProduct(product: InventoryProductRef) {
    this.products.set(product.id, clone(product));
  }

  seedUnit(unit: InventoryUnitRef) {
    this.units.set(unit.id, clone(unit));
  }

  async findById(businessId: string, id: string): Promise<InventoryProductRef | null> {
    const product = this.products.get(id);
    if (!product || product.businessId !== businessId) {
      return null;
    }
    return clone(product);
  }

  async listByBusiness(businessId: string): Promise<InventoryProductRef[]> {
    return [...this.products.values()]
      .filter((row) => row.businessId === businessId)
      .map((row) => clone(row));
  }

  async findUnit(businessId: string, unitId: string): Promise<InventoryUnitRef | null> {
    const unit = this.units.get(unitId);
    if (!unit || unit.businessId !== businessId) {
      return null;
    }
    return clone(unit);
  }

  readonly unitPort: InventoryUnitCataloguePort = {
    findById: (businessId, unitId) => this.findUnit(businessId, unitId),
    listActive: (businessId) => this.listActiveUnits(businessId),
  };

  async listActiveUnits(businessId: string): Promise<InventoryUnitRef[]> {
    return [...this.units.values()]
      .filter((row) => row.businessId === businessId && row.status === "ACTIVE")
      .map((row) => clone(row));
  }

  async listItemTypes() {
    return this.itemTypes.map((row) => clone(row));
  }

  async findItemType(code: string) {
    return this.itemTypes.find((row) => row.code === code) ?? null;
  }

  async listLocationTypes() {
    return this.locationTypes.map((row) => clone(row));
  }

  async findLocationType(code: string) {
    return this.locationTypes.find((row) => row.code === code) ?? null;
  }

  async insert(values: StockItemInsert): Promise<StockItemRecord> {
    const record: StockItemRecord = {
      id: values.id ?? newId(),
      businessId: values.businessId,
      productId: values.productId,
      sku: values.sku,
      barcode: values.barcode,
      stockTrackingEnabled: values.stockTrackingEnabled,
      itemTypeCode: values.itemTypeCode,
      baseUomId: values.baseUomId,
      purchaseUomId: values.purchaseUomId,
      salesUomId: values.salesUomId,
      conversionFactor: asNumeric(values.conversionFactor),
      reorderLevel: asNumeric(values.reorderLevel),
      reorderQuantity: asNumeric(values.reorderQuantity),
      minimumStockLevel: asNumeric(values.minimumStockLevel),
      maximumStockLevel: asNumeric(values.maximumStockLevel),
      safetyStock: asNumeric(values.safetyStock),
      leadTimeDays: values.leadTimeDays ?? null,
      reviewPeriodDays: values.reviewPeriodDays ?? null,
      isActive: values.isActive,
      trackingMode: values.trackingMode || "NONE",
      expiryTrackingEnabled: values.expiryTrackingEnabled ?? false,
      allowExpiredFulfilment: values.allowExpiredFulfilment ?? false,
      metadata: values.metadata,
      createdAt: now(),
      createdBy: values.createdBy,
      updatedAt: now(),
      updatedBy: values.updatedBy,
      deletedAt: null,
      version: 1,
    };
    this.stockItems.set(record.id, record);
    return clone(record);
  }

  async update(
    businessId: string,
    stockItemId: string,
    patch: StockItemPatch
  ): Promise<StockItemRecord> {
    const existing = this.stockItems.get(stockItemId);
    if (!existing || existing.businessId !== businessId) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCK_ITEM_NOT_FOUND, undefined, 404);
    }
    const next: StockItemRecord = {
      ...existing,
      ...patch,
      updatedAt: now(),
      version: existing.version + 1,
    };
    this.stockItems.set(stockItemId, next);
    return clone(next);
  }

  async findStockItem(businessId: string, stockItemId: string) {
    const row = this.stockItems.get(stockItemId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return clone(row);
  }

  async findActiveByProduct(businessId: string, productId: string) {
    const row = [...this.stockItems.values()].find(
      (item) =>
        item.businessId === businessId &&
        item.productId === productId &&
        item.isActive &&
        !item.deletedAt
    );
    return row ? clone(row) : null;
  }

  async findBySku(businessId: string, sku: string) {
    const row = [...this.stockItems.values()].find(
      (item) => item.businessId === businessId && item.sku === sku && !item.deletedAt
    );
    return row ? clone(row) : null;
  }

  async listStockItems(businessId: string) {
    return [...this.stockItems.values()]
      .filter((row) => row.businessId === businessId && !row.deletedAt)
      .map((row) => clone(row));
  }

  readonly stockItemPort: StockItemRepositoryPort = {
    insert: (values) => this.insert(values),
    update: (businessId, stockItemId, patch) => this.update(businessId, stockItemId, patch),
    findById: (businessId, stockItemId) => this.findStockItem(businessId, stockItemId),
    findActiveByProduct: (businessId, productId) =>
      this.findActiveByProduct(businessId, productId),
    findBySku: (businessId, sku) => this.findBySku(businessId, sku),
    listByBusiness: (businessId) => this.listStockItems(businessId),
  };

  async insertLocation(values: InventoryLocationInsert): Promise<InventoryLocationRecord> {
    const record: InventoryLocationRecord = {
      id: values.id ?? newId(),
      businessId: values.businessId,
      code: values.code,
      name: values.name,
      description: values.description,
      locationTypeCode: values.locationTypeCode,
      parentLocationId: values.parentLocationId,
      isActive: values.isActive,
      metadata: values.metadata,
      createdAt: now(),
      createdBy: values.createdBy,
      updatedAt: now(),
      updatedBy: values.updatedBy,
      deletedAt: null,
      version: 1,
    };
    this.locations.set(record.id, record);
    return clone(record);
  }

  async updateLocation(
    businessId: string,
    locationId: string,
    patch: InventoryLocationPatch
  ): Promise<InventoryLocationRecord> {
    const existing = this.locations.get(locationId);
    if (!existing || existing.businessId !== businessId) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LOCATION_NOT_FOUND, undefined, 404);
    }
    const next: InventoryLocationRecord = {
      ...existing,
      ...patch,
      updatedAt: now(),
      version: existing.version + 1,
    };
    this.locations.set(locationId, next);
    return clone(next);
  }

  async findLocation(businessId: string, locationId: string) {
    const row = this.locations.get(locationId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return clone(row);
  }

  async findLocationByCode(businessId: string, code: string) {
    const row = [...this.locations.values()].find(
      (item) => item.businessId === businessId && item.code === code && !item.deletedAt
    );
    return row ? clone(row) : null;
  }

  async listLocations(businessId: string) {
    return [...this.locations.values()]
      .filter((row) => row.businessId === businessId && !row.deletedAt)
      .map((row) => clone(row));
  }

  readonly locationPort: InventoryLocationRepositoryPort = {
    insert: (values) => this.insertLocation(values),
    update: (businessId, locationId, patch) =>
      this.updateLocation(businessId, locationId, patch),
    findById: (businessId, locationId) => this.findLocation(businessId, locationId),
    findByCode: (businessId, code) => this.findLocationByCode(businessId, code),
    listByBusiness: (businessId) => this.listLocations(businessId),
  };

  async insertItemLocation(values: StockItemLocationInsert): Promise<StockItemLocationRecord> {
    const record: StockItemLocationRecord = {
      id: values.id ?? newId(),
      businessId: values.businessId,
      stockItemId: values.stockItemId,
      locationId: values.locationId,
      isActive: values.isActive,
      reorderLevelOverride: asNumeric(values.reorderLevelOverride),
      minimumStockLevelOverride: asNumeric(values.minimumStockLevelOverride),
      maximumStockLevelOverride: asNumeric(values.maximumStockLevelOverride),
      reorderQuantityOverride: asNumeric(values.reorderQuantityOverride),
      safetyStockOverride: asNumeric(values.safetyStockOverride),
      metadata: values.metadata,
      createdAt: now(),
      createdBy: values.createdBy,
      updatedAt: now(),
      updatedBy: values.updatedBy,
      deletedAt: null,
      version: 1,
    };
    this.itemLocations.set(record.id, record);
    return clone(record);
  }

  async updateItemLocation(
    businessId: string,
    configId: string,
    patch: StockItemLocationPatch
  ): Promise<StockItemLocationRecord> {
    const existing = this.itemLocations.get(configId);
    if (!existing || existing.businessId !== businessId) {
      throw new InventoryError(
        INVENTORY_ERROR_CODES.STOCK_ITEM_LOCATION_NOT_FOUND,
        undefined,
        404
      );
    }
    const next: StockItemLocationRecord = {
      ...existing,
      ...patch,
      updatedAt: now(),
      version: existing.version + 1,
    };
    this.itemLocations.set(configId, next);
    return clone(next);
  }

  async findItemLocation(businessId: string, configId: string) {
    const row = this.itemLocations.get(configId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return clone(row);
  }

  async findItemLocationByPair(businessId: string, stockItemId: string, locationId: string) {
    const row = [...this.itemLocations.values()].find(
      (item) =>
        item.businessId === businessId &&
        item.stockItemId === stockItemId &&
        item.locationId === locationId &&
        !item.deletedAt
    );
    return row ? clone(row) : null;
  }

  async listItemLocations(businessId: string, stockItemId: string) {
    return [...this.itemLocations.values()]
      .filter(
        (row) =>
          row.businessId === businessId && row.stockItemId === stockItemId && !row.deletedAt
      )
      .map((row) => clone(row));
  }

  readonly itemLocationPort: StockItemLocationRepositoryPort = {
    insert: (values) => this.insertItemLocation(values),
    update: (businessId, configId, patch) =>
      this.updateItemLocation(businessId, configId, patch),
    findById: (businessId, configId) => this.findItemLocation(businessId, configId),
    findByItemAndLocation: (businessId, stockItemId, locationId) =>
      this.findItemLocationByPair(businessId, stockItemId, locationId),
    listByStockItem: (businessId, stockItemId) =>
      this.listItemLocations(businessId, stockItemId),
    listByLocation: async (businessId, locationId) =>
      [...this.itemLocations.values()]
        .filter(
          (row) =>
            row.businessId === businessId && row.locationId === locationId && !row.deletedAt
        )
        .map((row) => clone(row)),
  };

  async insertMovement(values: InventoryMovementInsert): Promise<InventoryMovementRecord> {
    if (
      values.movementType === "OPENING_STOCK" ||
      values.movementType === "OPENING_BALANCE"
    ) {
      const existing = await this.findOpeningStock(
        values.businessId,
        values.stockItemId,
        values.locationId
      );
      if (existing) {
        throw new InventoryError(
          INVENTORY_ERROR_CODES.OPENING_STOCK_ALREADY_RECORDED,
          undefined,
          409
        );
      }
    }
    const record: InventoryMovementRecord = {
      id: values.id ?? newId(),
      businessId: values.businessId,
      stockItemId: values.stockItemId,
      locationId: values.locationId,
      movementType: values.movementType,
      quantity: values.quantity,
      uomId: values.uomId,
      reason: values.reason,
      occurredAt: values.occurredAt ?? now(),
      metadata: values.metadata,
      createdAt: now(),
      createdBy: values.createdBy,
    };
    this.movements.set(record.id, record);
    return clone(record);
  }

  async findOpeningStock(businessId: string, stockItemId: string, locationId: string) {
    const row = [...this.movements.values()].find(
      (item) =>
        item.businessId === businessId &&
        item.stockItemId === stockItemId &&
        item.locationId === locationId &&
        (item.movementType === "OPENING_STOCK" || item.movementType === "OPENING_BALANCE")
    );
    return row ? clone(row) : null;
  }

  async listMovementsByStockItem(businessId: string, stockItemId: string) {
    return [...this.movements.values()]
      .filter((row) => row.businessId === businessId && row.stockItemId === stockItemId)
      .map((row) => clone(row));
  }

  async listMovementsByLocation(businessId: string, locationId: string) {
    return [...this.movements.values()]
      .filter((row) => row.businessId === businessId && row.locationId === locationId)
      .map((row) => clone(row));
  }

  async countMovements(businessId: string) {
    return [...this.movements.values()].filter((row) => row.businessId === businessId).length;
  }

  readonly movementPort: InventoryMovementRepositoryPort = {
    insert: (values) => this.insertMovement(values),
    findOpeningStock: (businessId, stockItemId, locationId) =>
      this.findOpeningStock(businessId, stockItemId, locationId),
    listByStockItem: (businessId, stockItemId) =>
      this.listMovementsByStockItem(businessId, stockItemId),
    listByLocation: (businessId, locationId) =>
      this.listMovementsByLocation(businessId, locationId),
    countByBusiness: (businessId) => this.countMovements(businessId),
  };

  async insertBalance(values: InventoryBalanceInsert): Promise<InventoryBalanceRecord> {
    const record: InventoryBalanceRecord = {
      id: values.id ?? newId(),
      businessId: values.businessId,
      stockItemId: values.stockItemId,
      locationId: values.locationId,
      onHand: values.onHand,
      reserved: values.reserved,
      available: values.available,
      metadata: values.metadata,
      createdAt: now(),
      createdBy: values.createdBy,
      updatedAt: now(),
      updatedBy: values.updatedBy,
      version: 1,
    };
    this.balances.set(record.id, record);
    return clone(record);
  }

  async findBalance(businessId: string, stockItemId: string, locationId: string) {
    const row = [...this.balances.values()].find(
      (item) =>
        item.businessId === businessId &&
        item.stockItemId === stockItemId &&
        item.locationId === locationId
    );
    return row ? clone(row) : null;
  }

  async listBalancesByStockItem(businessId: string, stockItemId: string) {
    return [...this.balances.values()]
      .filter((row) => row.businessId === businessId && row.stockItemId === stockItemId)
      .map((row) => clone(row));
  }

  async listBalances(businessId: string) {
    return [...this.balances.values()]
      .filter((row) => row.businessId === businessId)
      .map((row) => clone(row));
  }

  async applyInboundOnHand(
    businessId: string,
    stockItemId: string,
    locationId: string,
    inboundQuantity: string,
    actorId: string | null
  ): Promise<InventoryBalanceRecord> {
    const existing = await this.findBalance(businessId, stockItemId, locationId);
    if (!existing) {
      const derived = openingStockBalance(inboundQuantity);
      return this.insertBalance({
        businessId,
        stockItemId,
        locationId,
        onHand: derived.onHand,
        reserved: derived.reserved,
        available: derived.available,
        metadata: null,
        createdBy: actorId,
        updatedBy: actorId,
      });
    }
    const nextOnHand = applyInboundQuantity(existing.onHand, inboundQuantity);
    const next: InventoryBalanceRecord = {
      ...existing,
      onHand: nextOnHand,
      available: deriveAvailableQuantity(nextOnHand, existing.reserved),
      updatedAt: now(),
      updatedBy: actorId,
      version: existing.version + 1,
    };
    this.balances.set(existing.id, next);
    return clone(next);
  }

  async applyReservationHold(
    businessId: string,
    stockItemId: string,
    locationId: string,
    reservedDelta: string,
    actorId: string | null
  ): Promise<InventoryBalanceRecord> {
    const existing = await this.findBalance(businessId, stockItemId, locationId);
    if (!existing) {
      throw new InventoryError(INVENTORY_ERROR_CODES.INSUFFICIENT_AVAILABLE_STOCK);
    }
    const nextReserved = applyInboundQuantity(existing.reserved, reservedDelta);
    const next: InventoryBalanceRecord = {
      ...existing,
      reserved: nextReserved,
      available: deriveAvailableQuantity(existing.onHand, nextReserved),
      updatedAt: now(),
      updatedBy: actorId,
      version: existing.version + 1,
    };
    this.balances.set(existing.id, next);
    return clone(next);
  }

  async applySaleDeduction(
    businessId: string,
    stockItemId: string,
    locationId: string,
    deductedQuantity: string,
    actorId: string | null
  ): Promise<InventoryBalanceRecord> {
    const existing = await this.findBalance(businessId, stockItemId, locationId);
    if (!existing) {
      throw new InventoryError(INVENTORY_ERROR_CODES.INSUFFICIENT_AVAILABLE_STOCK);
    }
    const nextOnHand = applyOutboundQuantity(existing.onHand, deductedQuantity);
    const nextReserved = applyOutboundQuantity(existing.reserved, deductedQuantity);
    const next: InventoryBalanceRecord = {
      ...existing,
      onHand: nextOnHand,
      reserved: nextReserved,
      available: deriveAvailableQuantity(nextOnHand, nextReserved),
      updatedAt: now(),
      updatedBy: actorId,
      version: existing.version + 1,
    };
    this.balances.set(existing.id, next);
    return clone(next);
  }

  async applyOutboundOnHand(
    businessId: string,
    stockItemId: string,
    locationId: string,
    outboundQuantity: string,
    actorId: string | null
  ): Promise<InventoryBalanceRecord> {
    const existing = await this.findBalance(businessId, stockItemId, locationId);
    if (!existing) {
      throw new InventoryError(INVENTORY_ERROR_CODES.INSUFFICIENT_STOCK_FOR_ADJUSTMENT);
    }
    const nextOnHand = applyOutboundQuantity(existing.onHand, outboundQuantity);
    const next: InventoryBalanceRecord = {
      ...existing,
      onHand: nextOnHand,
      available: deriveAvailableQuantity(nextOnHand, existing.reserved),
      updatedAt: now(),
      updatedBy: actorId,
      version: existing.version + 1,
    };
    this.balances.set(existing.id, next);
    return clone(next);
  }

  readonly balancePort: InventoryBalanceRepositoryPort = {
    insert: (values) => this.insertBalance(values),
    applyInboundOnHand: (businessId, stockItemId, locationId, inboundQuantity, actorId) =>
      this.applyInboundOnHand(businessId, stockItemId, locationId, inboundQuantity, actorId),
    applyReservationHold: (businessId, stockItemId, locationId, reservedDelta, actorId) =>
      this.applyReservationHold(businessId, stockItemId, locationId, reservedDelta, actorId),
    applySaleDeduction: (businessId, stockItemId, locationId, deductedQuantity, actorId) =>
      this.applySaleDeduction(businessId, stockItemId, locationId, deductedQuantity, actorId),
    applyOutboundOnHand: (businessId, stockItemId, locationId, outboundQuantity, actorId) =>
      this.applyOutboundOnHand(businessId, stockItemId, locationId, outboundQuantity, actorId),
    findByItemAndLocation: (businessId, stockItemId, locationId) =>
      this.findBalance(businessId, stockItemId, locationId),
    listByStockItem: (businessId, stockItemId) =>
      this.listBalancesByStockItem(businessId, stockItemId),
    listByBusiness: (businessId) => this.listBalances(businessId),
  };

  readonly productPort: InventoryProductCataloguePort = {
    findById: (businessId, productId) => this.findById(businessId, productId),
    listByBusiness: (businessId) => this.listByBusiness(businessId),
  };

  readonly typePort: InventoryTypeCataloguePort = {
    listItemTypes: () => this.listItemTypes(),
    findItemType: (code) => this.findItemType(code),
    listLocationTypes: () => this.listLocationTypes(),
    findLocationType: (code) => this.findLocationType(code),
  };

  seedControl(control: InventoryOperationControl) {
    this.controls.set(control.code, clone(control));
  }

  seedSupplier(businessId: string, supplier: InventorySupplierRef) {
    this.suppliers.set(supplier.id, { ...clone(supplier), businessId });
  }

  readonly controlPort: InventoryOperationControlPort = {
    getControl: async (businessId, operationCode) => {
      void businessId;
      const row = this.controls.get(operationCode);
      return row ? clone(row) : null;
    },
  };

  readonly supplierPort: InventorySupplierPort = {
    findActiveSupplier: async (businessId, partyId) => {
      const row = this.suppliers.get(partyId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return { id: row.id, displayName: row.displayName };
    },
    listActiveSuppliers: async (businessId) =>
      [...this.suppliers.values()]
        .filter((row) => row.businessId === businessId)
        .map((row) => ({ id: row.id, displayName: row.displayName })),
  };

  readonly receiptPort: InventoryReceiptRepositoryPort = {
    insert: async (values: InventoryReceiptInsert) => {
      const record: InventoryReceiptRecord = {
        id: values.id ?? newId(),
        ...values,
        createdAt: now(),
        updatedAt: now(),
        version: 1,
      };
      this.receipts.set(record.id, record);
      return clone(record);
    },
    update: async (businessId, receiptId, patch: InventoryReceiptPatch) => {
      const existing = this.receipts.get(receiptId);
      if (!existing || existing.businessId !== businessId) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
      }
      const next: InventoryReceiptRecord = {
        ...existing,
        ...patch,
        updatedAt: now(),
        version: patch.version ?? existing.version + 1,
      };
      this.receipts.set(receiptId, next);
      return clone(next);
    },
    findById: async (businessId, receiptId) => {
      const row = this.receipts.get(receiptId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return clone(row);
    },
    listByBusiness: async (businessId) =>
      [...this.receipts.values()]
        .filter((row) => row.businessId === businessId)
        .map((row) => clone(row)),
  };

  readonly receiptLinePort: InventoryReceiptLineRepositoryPort = {
    insert: async (values: InventoryInboundLineInsert) => {
      const record: InventoryInboundLineRecord = {
        id: values.id ?? newId(),
        ...values,
        createdAt: now(),
        updatedAt: now(),
      };
      this.receiptLines.set(record.id, record);
      return clone(record);
    },
    update: async (businessId, lineId, patch: InventoryInboundLinePatch) => {
      const existing = this.receiptLines.get(lineId);
      if (!existing || existing.businessId !== businessId) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
      }
      const next = { ...existing, ...patch, updatedAt: now() };
      this.receiptLines.set(lineId, next);
      return clone(next);
    },
    findById: async (businessId, lineId) => {
      const row = this.receiptLines.get(lineId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return clone(row);
    },
    listByHeader: async (businessId, headerId) =>
      [...this.receiptLines.values()]
        .filter((row) => row.businessId === businessId && row.headerId === headerId)
        .sort((a, b) => a.lineNumber - b.lineNumber)
        .map((row) => clone(row)),
  };

  readonly openingPort: InventoryOpeningBalanceRepositoryPort = {
    insert: async (values: InventoryOpeningBalanceInsert) => {
      const record: InventoryOpeningBalanceRecord = {
        id: values.id ?? newId(),
        ...values,
        createdAt: now(),
        updatedAt: now(),
        version: 1,
      };
      this.openings.set(record.id, record);
      return clone(record);
    },
    update: async (businessId, openingId, patch: InventoryOpeningBalancePatch) => {
      const existing = this.openings.get(openingId);
      if (!existing || existing.businessId !== businessId) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
      }
      const next: InventoryOpeningBalanceRecord = {
        ...existing,
        ...patch,
        updatedAt: now(),
        version: patch.version ?? existing.version + 1,
      };
      this.openings.set(openingId, next);
      return clone(next);
    },
    findById: async (businessId, openingId) => {
      const row = this.openings.get(openingId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return clone(row);
    },
    listByBusiness: async (businessId) =>
      [...this.openings.values()]
        .filter((row) => row.businessId === businessId)
        .map((row) => clone(row)),
  };

  readonly openingLinePort: InventoryOpeningBalanceLineRepositoryPort = {
    insert: async (values: InventoryInboundLineInsert) => {
      const record: InventoryInboundLineRecord = {
        id: values.id ?? newId(),
        ...values,
        createdAt: now(),
        updatedAt: now(),
      };
      this.openingLines.set(record.id, record);
      return clone(record);
    },
    update: async (businessId, lineId, patch: InventoryInboundLinePatch) => {
      const existing = this.openingLines.get(lineId);
      if (!existing || existing.businessId !== businessId) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
      }
      const next = { ...existing, ...patch, updatedAt: now() };
      this.openingLines.set(lineId, next);
      return clone(next);
    },
    findById: async (businessId, lineId) => {
      const row = this.openingLines.get(lineId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return clone(row);
    },
    listByHeader: async (businessId, headerId) =>
      [...this.openingLines.values()]
        .filter((row) => row.businessId === businessId && row.headerId === headerId)
        .sort((a, b) => a.lineNumber - b.lineNumber)
        .map((row) => clone(row)),
  };

  readonly idempotencyPort: InventoryIdempotencyPort = {
    insert: async (values: InventoryIdempotencyInsert) => {
      const key = `${values.businessId}:${values.operationType}:${values.idempotencyKey}`;
      const existing = this.idempotency.get(key);
      if (existing) {
        return clone(existing);
      }
      const record = {
        id: newId(),
        ...values,
        createdAt: now(),
      };
      this.idempotency.set(key, record);
      return clone(record);
    },
    find: async (businessId, operationType, idempotencyKey) => {
      const row = this.idempotency.get(`${businessId}:${operationType}:${idempotencyKey}`);
      return row ? clone(row) : null;
    },
  };

  readonly reservationPort: InventoryReservationRepositoryPort = {
    insert: async (values: InventoryReservationInsert) => {
      const record: InventoryReservationRecord = {
        id: values.id ?? newId(),
        ...values,
        createdAt: now(),
        updatedAt: now(),
        version: 1,
      };
      this.reservations.set(record.id, record);
      return clone(record);
    },
    update: async (businessId, reservationId, patch: InventoryReservationPatch) => {
      const existing = this.reservations.get(reservationId);
      if (!existing || existing.businessId !== businessId) {
        throw new InventoryError(INVENTORY_ERROR_CODES.RESERVATION_NOT_FOUND, undefined, 404);
      }
      const next: InventoryReservationRecord = {
        ...existing,
        ...patch,
        updatedAt: now(),
        version: patch.version ?? existing.version + 1,
      };
      this.reservations.set(reservationId, next);
      return clone(next);
    },
    findById: async (businessId, reservationId) => {
      const row = this.reservations.get(reservationId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return clone(row);
    },
    findByIdempotencyKey: async (businessId, idempotencyKey) => {
      const row = [...this.reservations.values()].find(
        (item) => item.businessId === businessId && item.idempotencyKey === idempotencyKey
      );
      return row ? clone(row) : null;
    },
    findActiveBySaleLine: async (businessId, salesOrderLineId) => {
      const row = [...this.reservations.values()].find(
        (item) =>
          item.businessId === businessId &&
          item.salesOrderLineId === salesOrderLineId &&
          (item.status === INVENTORY_RESERVATION_STATUSES.REQUESTED ||
            item.status === INVENTORY_RESERVATION_STATUSES.RESERVED ||
            item.status === INVENTORY_RESERVATION_STATUSES.PARTIALLY_FULFILLED)
      );
      return row ? clone(row) : null;
    },
    listByBusiness: async (businessId) =>
      [...this.reservations.values()]
        .filter((row) => row.businessId === businessId)
        .map((row) => clone(row)),
    listActiveByItemLocation: async (businessId, stockItemId, locationId) =>
      [...this.reservations.values()]
        .filter(
          (row) =>
            row.businessId === businessId &&
            row.stockItemId === stockItemId &&
            row.locationId === locationId &&
            (row.status === INVENTORY_RESERVATION_STATUSES.RESERVED ||
              row.status === INVENTORY_RESERVATION_STATUSES.PARTIALLY_FULFILLED)
        )
        .map((row) => clone(row)),
  };

  readonly fulfilmentPort: InventoryFulfilmentRepositoryPort = {
    insert: async (values: InventoryFulfilmentInsert) => {
      const record: InventoryFulfilmentRecord = {
        id: values.id ?? newId(),
        ...values,
        createdAt: now(),
      };
      this.fulfilments.set(record.id, record);
      return clone(record);
    },
    findByIdempotencyKey: async (businessId, idempotencyKey) => {
      const row = [...this.fulfilments.values()].find(
        (item) => item.businessId === businessId && item.idempotencyKey === idempotencyKey
      );
      return row ? clone(row) : null;
    },
    listByReservation: async (businessId, reservationId) =>
      [...this.fulfilments.values()]
        .filter((row) => row.businessId === businessId && row.reservationId === reservationId)
        .map((row) => clone(row)),
  };

  readonly adjustmentPort: InventoryAdjustmentRepositoryPort = {
    insert: async (values: InventoryAdjustmentInsert) => {
      const record: InventoryAdjustmentRecord = {
        ...values,
        id: values.id ?? newId(),
        createdAt: now(),
        updatedAt: now(),
        version: 1,
      };
      this.adjustments.set(record.id, record);
      return clone(record);
    },
    update: async (businessId, adjustmentId, patch: InventoryAdjustmentPatch) => {
      const existing = this.adjustments.get(adjustmentId);
      if (!existing || existing.businessId !== businessId) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
      }
      const next: InventoryAdjustmentRecord = {
        ...existing,
        ...patch,
        updatedAt: now(),
        version: patch.version ?? existing.version + 1,
      };
      this.adjustments.set(adjustmentId, next);
      return clone(next);
    },
    findById: async (businessId, adjustmentId) => {
      const row = this.adjustments.get(adjustmentId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return clone(row);
    },
    findByIdempotencyKey: async (businessId, idempotencyKey) => {
      const row = [...this.adjustments.values()].find(
        (item) => item.businessId === businessId && item.idempotencyKey === idempotencyKey
      );
      return row ? clone(row) : null;
    },
    listByBusiness: async (businessId) =>
      [...this.adjustments.values()]
        .filter((row) => row.businessId === businessId)
        .map((row) => clone(row)),
  };

  readonly adjustmentLinePort: InventoryAdjustmentLineRepositoryPort = {
    insert: async (values: InventoryAdjustmentLineInsert) => {
      const record: InventoryAdjustmentLineRecord = {
        ...values,
        id: values.id ?? newId(),
        createdAt: now(),
        updatedAt: now(),
      };
      this.adjustmentLines.set(record.id, record);
      return clone(record);
    },
    update: async (businessId, lineId, patch: InventoryAdjustmentLinePatch) => {
      const existing = this.adjustmentLines.get(lineId);
      if (!existing || existing.businessId !== businessId) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
      }
      const next = { ...existing, ...patch, updatedAt: now() };
      this.adjustmentLines.set(lineId, next);
      return clone(next);
    },
    findById: async (businessId, lineId) => {
      const row = this.adjustmentLines.get(lineId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return clone(row);
    },
    listByHeader: async (businessId, headerId) =>
      [...this.adjustmentLines.values()]
        .filter((row) => row.businessId === businessId && row.headerId === headerId)
        .sort((a, b) => a.lineNumber - b.lineNumber)
        .map((row) => clone(row)),
  };

  readonly stocktakePort: InventoryStocktakeRepositoryPort = {
    insert: async (values: InventoryStocktakeInsert) => {
      const record: InventoryStocktakeRecord = {
        ...values,
        id: values.id ?? newId(),
        createdAt: now(),
        updatedAt: now(),
        version: 1,
      };
      this.stocktakes.set(record.id, record);
      return clone(record);
    },
    update: async (businessId, stocktakeId, patch: InventoryStocktakePatch) => {
      const existing = this.stocktakes.get(stocktakeId);
      if (!existing || existing.businessId !== businessId) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
      }
      const next: InventoryStocktakeRecord = {
        ...existing,
        ...patch,
        updatedAt: now(),
        version: patch.version ?? existing.version + 1,
      };
      this.stocktakes.set(stocktakeId, next);
      return clone(next);
    },
    findById: async (businessId, stocktakeId) => {
      const row = this.stocktakes.get(stocktakeId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return clone(row);
    },
    findByIdempotencyKey: async (businessId, idempotencyKey) => {
      const row = [...this.stocktakes.values()].find(
        (item) => item.businessId === businessId && item.idempotencyKey === idempotencyKey
      );
      return row ? clone(row) : null;
    },
    listByBusiness: async (businessId) =>
      [...this.stocktakes.values()]
        .filter((row) => row.businessId === businessId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((row) => clone(row)),
  };

  readonly stocktakeLinePort: InventoryStocktakeLineRepositoryPort = {
    insert: async (values: InventoryStocktakeLineInsert) => {
      const record: InventoryStocktakeLineRecord = {
        ...values,
        id: values.id ?? newId(),
        createdAt: now(),
        updatedAt: now(),
      };
      this.stocktakeLines.set(record.id, record);
      return clone(record);
    },
    update: async (businessId, lineId, patch: InventoryStocktakeLinePatch) => {
      const existing = this.stocktakeLines.get(lineId);
      if (!existing || existing.businessId !== businessId) {
        throw new InventoryError(INVENTORY_ERROR_CODES.STOCKTAKE_LINE_NOT_FOUND, undefined, 404);
      }
      const next = { ...existing, ...patch, updatedAt: now() };
      this.stocktakeLines.set(lineId, next);
      return clone(next);
    },
    findById: async (businessId, lineId) => {
      const row = this.stocktakeLines.get(lineId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return clone(row);
    },
    listByHeader: async (businessId, headerId) =>
      [...this.stocktakeLines.values()]
        .filter((row) => row.businessId === businessId && row.headerId === headerId)
        .sort((a, b) => a.lineNumber - b.lineNumber)
        .map((row) => clone(row)),
  };

  readonly stocktakeCountPort: InventoryStocktakeCountRepositoryPort = {
    insert: async (values: InventoryStocktakeCountInsert) => {
      const record: InventoryStocktakeCountRecord = {
        ...values,
        id: values.id ?? newId(),
        createdAt: now(),
      };
      this.stocktakeCounts.set(record.id, record);
      return clone(record);
    },
    listByLine: async (businessId, lineId) =>
      [...this.stocktakeCounts.values()]
        .filter((row) => row.businessId === businessId && row.lineId === lineId)
        .sort((a, b) => a.sequence - b.sequence)
        .map((row) => clone(row)),
  };

  readonly lotPort: InventoryLotRepositoryPort = {
    insert: async (values: InventoryLotInsert) => {
      const duplicate = [...this.lots.values()].find(
        (row) =>
          row.businessId === values.businessId &&
          row.stockItemId === values.stockItemId &&
          row.lotCode === values.lotCode
      );
      if (duplicate) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_LOT, undefined, 409);
      }
      const record: InventoryLotRecord = {
        ...values,
        id: values.id ?? newId(),
        createdAt: now(),
        updatedAt: now(),
      };
      this.lots.set(record.id, record);
      return clone(record);
    },
    update: async (businessId, lotId, patch: InventoryLotPatch) => {
      const existing = this.lots.get(lotId);
      if (!existing || existing.businessId !== businessId) {
        throw new InventoryError(INVENTORY_ERROR_CODES.LOT_NOT_FOUND, undefined, 404);
      }
      const next = { ...existing, ...patch, updatedAt: now() };
      this.lots.set(lotId, next);
      return clone(next);
    },
    findById: async (businessId, lotId) => {
      const row = this.lots.get(lotId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return clone(row);
    },
    findByCode: async (businessId, stockItemId, lotCode) => {
      const row = [...this.lots.values()].find(
        (item) =>
          item.businessId === businessId &&
          item.stockItemId === stockItemId &&
          item.lotCode === lotCode
      );
      return row ? clone(row) : null;
    },
    listByItem: async (businessId, stockItemId) =>
      [...this.lots.values()]
        .filter((row) => row.businessId === businessId && row.stockItemId === stockItemId)
        .map((row) => clone(row)),
    listByBusiness: async (businessId) =>
      [...this.lots.values()]
        .filter((row) => row.businessId === businessId)
        .map((row) => clone(row)),
  };

  readonly trackedUnitPort: InventoryTrackedUnitRepositoryPort = {
    insert: async (values: InventoryTrackedUnitInsert) => {
      const duplicate = [...this.trackedUnits.values()].find(
        (row) => row.businessId === values.businessId && row.unitCode === values.unitCode
      );
      if (duplicate) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_TRACKED_UNIT, undefined, 409);
      }
      const record: InventoryTrackedUnitRecord = {
        ...values,
        id: values.id ?? newId(),
        createdAt: now(),
        updatedAt: now(),
      };
      this.trackedUnits.set(record.id, record);
      return clone(record);
    },
    update: async (businessId, unitId, patch: InventoryTrackedUnitPatch) => {
      const existing = this.trackedUnits.get(unitId);
      if (!existing || existing.businessId !== businessId) {
        throw new InventoryError(INVENTORY_ERROR_CODES.TRACKED_UNIT_NOT_FOUND, undefined, 404);
      }
      const next = { ...existing, ...patch, updatedAt: now() };
      this.trackedUnits.set(unitId, next);
      return clone(next);
    },
    findById: async (businessId, unitId) => {
      const row = this.trackedUnits.get(unitId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return clone(row);
    },
    findByCode: async (businessId, unitCode) => {
      const row = [...this.trackedUnits.values()].find(
        (item) => item.businessId === businessId && item.unitCode === unitCode
      );
      return row ? clone(row) : null;
    },
    listByItem: async (businessId, stockItemId) =>
      [...this.trackedUnits.values()]
        .filter((row) => row.businessId === businessId && row.stockItemId === stockItemId)
        .map((row) => clone(row)),
    listByBusiness: async (businessId) =>
      [...this.trackedUnits.values()]
        .filter((row) => row.businessId === businessId)
        .map((row) => clone(row)),
  };

  readonly lineTracePort: InventoryLineTraceRepositoryPort = {
    insert: async (values: InventoryLineTraceInsert) => {
      const existing = [...this.lineTraces.values()].find(
        (row) =>
          row.businessId === values.businessId &&
          row.sourceType === values.sourceType &&
          row.sourceLineId === values.sourceLineId
      );
      if (existing) {
        return clone(existing);
      }
      const record: InventoryLineTraceRecord = {
        ...values,
        id: values.id ?? newId(),
        createdAt: now(),
      };
      this.lineTraces.set(record.id, record);
      return clone(record);
    },
    findBySourceLine: async (businessId, sourceType, sourceLineId) => {
      const row = [...this.lineTraces.values()].find(
        (item) =>
          item.businessId === businessId &&
          item.sourceType === sourceType &&
          item.sourceLineId === sourceLineId
      );
      return row ? clone(row) : null;
    },
    listByStockItem: async (businessId, stockItemId) =>
      [...this.lineTraces.values()]
        .filter((row) => row.businessId === businessId && row.stockItemId === stockItemId)
        .map((row) => clone(row)),
  };

  readonly traceAllocationPort: InventoryTraceAllocationRepositoryPort = {
    insert: async (values: InventoryTraceAllocationInsert) => {
      const record: InventoryTraceAllocationRecord = {
        ...values,
        id: values.id ?? newId(),
        createdAt: now(),
      };
      this.traceAllocations.set(record.id, record);
      return clone(record);
    },
    listByMovement: async (businessId, movementId) =>
      [...this.traceAllocations.values()]
        .filter((row) => row.businessId === businessId && row.movementId === movementId)
        .map((row) => clone(row)),
    listByLot: async (businessId, lotId) =>
      [...this.traceAllocations.values()]
        .filter((row) => row.businessId === businessId && row.lotId === lotId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((row) => clone(row)),
    listByTrackedUnit: async (businessId, trackedUnitId) =>
      [...this.traceAllocations.values()]
        .filter((row) => row.businessId === businessId && row.trackedUnitId === trackedUnitId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((row) => clone(row)),
    listByItem: async (businessId, stockItemId) =>
      [...this.traceAllocations.values()]
        .filter((row) => row.businessId === businessId && row.stockItemId === stockItemId)
        .map((row) => clone(row)),
  };

  readonly advicePort: InventoryReplenishmentAdviceRepositoryPort = {
    insert: async (values: InventoryReplenishmentAdviceInsert) => {
      const active = [...this.advice.values()].find(
        (row) =>
          row.businessId === values.businessId &&
          row.stockItemId === values.stockItemId &&
          row.locationId === values.locationId &&
          row.conditionCode === values.conditionCode &&
          (row.status === "OPEN" || row.status === "ACKNOWLEDGED")
      );
      if (active) {
        return clone(active);
      }
      const record: InventoryReplenishmentAdviceRecord = {
        ...values,
        id: values.id ?? newId(),
        acknowledgedAt: values.acknowledgedAt ?? null,
        closedAt: values.closedAt ?? null,
        createdAt: now(),
        updatedAt: now(),
      };
      this.advice.set(record.id, record);
      return clone(record);
    },
    update: async (businessId, adviceId, patch: InventoryReplenishmentAdvicePatch) => {
      const existing = this.advice.get(adviceId);
      if (!existing || existing.businessId !== businessId) {
        throw new InventoryError(INVENTORY_ERROR_CODES.ADVICE_NOT_FOUND, undefined, 404);
      }
      const next = { ...existing, ...patch, updatedAt: now() };
      this.advice.set(adviceId, next);
      return clone(next);
    },
    findById: async (businessId, adviceId) => {
      const row = this.advice.get(adviceId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return clone(row);
    },
    findActive: async (businessId, stockItemId, locationId, conditionCode) => {
      const row = [...this.advice.values()].find(
        (item) =>
          item.businessId === businessId &&
          item.stockItemId === stockItemId &&
          item.locationId === locationId &&
          item.conditionCode === conditionCode &&
          (item.status === "OPEN" || item.status === "ACKNOWLEDGED")
      );
      return row ? clone(row) : null;
    },
    listByBusiness: async (businessId) =>
      [...this.advice.values()]
        .filter((row) => row.businessId === businessId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((row) => clone(row)),
  };

  readonly controlChangePort: InventoryControlChangeRepositoryPort = {
    insert: async (values: InventoryControlChangeInsert) => {
      const record: InventoryControlChangeRecord = {
        ...values,
        id: values.id ?? newId(),
        createdAt: now(),
        updatedAt: now(),
      };
      this.controlChanges.set(record.id, record);
      return clone(record);
    },
    update: async (businessId, changeId, patch: InventoryControlChangePatch) => {
      const existing = this.controlChanges.get(changeId);
      if (!existing || existing.businessId !== businessId) {
        throw new InventoryError(INVENTORY_ERROR_CODES.CONTROL_CHANGE_NOT_FOUND, undefined, 404);
      }
      const next = { ...existing, ...patch, updatedAt: now() };
      this.controlChanges.set(changeId, next);
      return clone(next);
    },
    findById: async (businessId, changeId) => {
      const row = this.controlChanges.get(changeId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return clone(row);
    },
    listByBusiness: async (businessId) =>
      [...this.controlChanges.values()]
        .filter((row) => row.businessId === businessId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((row) => clone(row)),
    listPendingByItem: async (businessId, stockItemId) =>
      [...this.controlChanges.values()]
        .filter(
          (row) =>
            row.businessId === businessId &&
            row.stockItemId === stockItemId &&
            (row.status === "DRAFT" || row.status === "APPROVAL_PENDING")
        )
        .map((row) => clone(row)),
  };

  readonly opsIncidentTypePort: InventoryOpsIncidentTypeCataloguePort = {
    listActive: async () => this.incidentTypes.filter((row) => row.isActive).map((row) => clone(row)),
  };

  readonly opsIncidentPort: InventoryOpsIncidentRepositoryPort &
    InventoryOpsIncidentEventRepositoryPort = {
    insert: async (values: InventoryOpsIncidentInsert) => {
      const record: InventoryOpsIncidentRecord = {
        ...values,
        id: values.id ?? newId(),
        createdAt: now(),
        updatedAt: now(),
      };
      this.opsIncidents.set(record.id, record);
      return clone(record);
    },
    update: async (businessId, incidentId, patch: InventoryOpsIncidentPatch) => {
      const existing = this.opsIncidents.get(incidentId);
      if (!existing || existing.businessId !== businessId) {
        throw new InventoryError(INVENTORY_ERROR_CODES.INCIDENT_NOT_FOUND, undefined, 404);
      }
      const next = { ...existing, ...patch, updatedAt: now() };
      this.opsIncidents.set(incidentId, next);
      return clone(next);
    },
    findById: async (businessId, incidentId) => {
      const row = this.opsIncidents.get(incidentId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return clone(row);
    },
    findActiveBySource: async (businessId, sourceType, sourceId, incidentType) => {
      const row = [...this.opsIncidents.values()].find(
        (item) =>
          item.businessId === businessId &&
          item.sourceType === sourceType &&
          item.sourceId === sourceId &&
          item.incidentType === incidentType &&
          (item.status === "OPEN" ||
            item.status === "INVESTIGATING" ||
            item.status === "APPROVAL_PENDING")
      );
      return row ? clone(row) : null;
    },
    findByIdempotencyKey: async (businessId, idempotencyKey) => {
      const row = [...this.opsIncidents.values()].find(
        (item) => item.businessId === businessId && item.idempotencyKey === idempotencyKey
      );
      return row ? clone(row) : null;
    },
    listByBusiness: async (businessId) =>
      [...this.opsIncidents.values()]
        .filter((row) => row.businessId === businessId)
        .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
        .map((row) => clone(row)),
    insertEvent: async (values: InventoryOpsIncidentEventInsert) => {
      const record: InventoryOpsIncidentEventRecord = {
        ...values,
        id: values.id ?? newId(),
        createdAt: now(),
      };
      this.opsIncidentEvents.set(record.id, record);
      return clone(record);
    },
    listEvents: async (businessId, incidentId) =>
      [...this.opsIncidentEvents.values()]
        .filter((row) => row.businessId === businessId && row.incidentId === incidentId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((row) => clone(row)),
  };

  readonly transferPort: InventoryTransferRepositoryPort = {
    insert: async (values: InventoryTransferInsert) => {
      const record: InventoryTransferRecord = {
        ...values,
        id: values.id ?? newId(),
        createdAt: now(),
        updatedAt: now(),
      };
      this.transfers.set(record.id, record);
      return clone(record);
    },
    update: async (businessId, transferId, patch: InventoryTransferPatch) => {
      const existing = this.transfers.get(transferId);
      if (!existing || existing.businessId !== businessId) {
        throw new InventoryError(INVENTORY_ERROR_CODES.TRANSFER_NOT_FOUND, undefined, 404);
      }
      const next = { ...existing, ...patch, updatedAt: now() };
      this.transfers.set(transferId, next);
      return clone(next);
    },
    findById: async (businessId, transferId) => {
      const row = this.transfers.get(transferId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return clone(row);
    },
    findByIdempotencyKey: async (businessId, idempotencyKey) => {
      const row = [...this.transfers.values()].find(
        (item) => item.businessId === businessId && item.idempotencyKey === idempotencyKey
      );
      return row ? clone(row) : null;
    },
    listByBusiness: async (businessId) =>
      [...this.transfers.values()]
        .filter((row) => row.businessId === businessId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((row) => clone(row)),
  };

  readonly transferLinePort: InventoryTransferLineRepositoryPort = {
    insert: async (values: InventoryTransferLineInsert) => {
      const record: InventoryTransferLineRecord = {
        ...values,
        id: values.id ?? newId(),
        createdAt: now(),
        updatedAt: now(),
      };
      this.transferLines.set(record.id, record);
      return clone(record);
    },
    update: async (businessId, lineId, patch: InventoryTransferLinePatch) => {
      const existing = this.transferLines.get(lineId);
      if (!existing || existing.businessId !== businessId) {
        throw new InventoryError(INVENTORY_ERROR_CODES.TRANSFER_NOT_FOUND, undefined, 404);
      }
      const next = { ...existing, ...patch, updatedAt: now() };
      this.transferLines.set(lineId, next);
      return clone(next);
    },
    listByHeader: async (businessId, transferId) =>
      [...this.transferLines.values()]
        .filter((row) => row.businessId === businessId && row.transferId === transferId)
        .sort((a, b) => a.lineNumber - b.lineNumber)
        .map((row) => clone(row)),
    listOpenInTransit: async (businessId) => {
      const open = new Set(
        [...this.transfers.values()]
          .filter(
            (row) =>
              row.businessId === businessId &&
              (row.status === "DISPATCHED" ||
                row.status === "IN_TRANSIT" ||
                row.status === "DISCREPANCY")
          )
          .map((row) => row.id)
      );
      return [...this.transferLines.values()]
        .filter((row) => row.businessId === businessId && open.has(row.transferId))
        .map((row) => clone(row));
    },
  };
}
