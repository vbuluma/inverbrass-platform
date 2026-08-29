/**
 * Purpose:
 * Orchestrate BP-008 IP-01 inventory foundation: stock items, locations,
 * item-location configuration, and opening stock. Does not receive, reserve,
 * transfer, adjust, value, or deduct stock.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { randomUUID } from "node:crypto";

import {
  INVENTORY_IP01_MOVEMENT_TYPES,
  INVENTORY_MOVEMENT_TYPES,
  compareInventoryQuantity,
  deriveAvailableQuantity,
  openingStockBalance,
} from "@/core/inventory-engine";
import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  INVENTORY_AUDIT_ACTIONS,
  INVENTORY_LOCATION_TYPE_LABELS,
  STOCK_ITEM_TYPE_LABELS,
} from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryAuditPort,
  InventoryBalanceRepositoryPort,
  InventoryLocationRepositoryPort,
  InventoryMovementRepositoryPort,
  InventoryProductCataloguePort,
  InventoryTraceabilityPort,
  InventoryTypeCataloguePort,
  InventoryUnitCataloguePort,
  StockItemLocationRepositoryPort,
  StockItemRepositoryPort,
} from "@/modules/inventory/ports";
import {
  createInventoryAuditAdapter,
} from "@/modules/inventory/services/inventory-audit-helper";
import { createInventoryCatalogueRepository } from "@/modules/inventory/repositories/inventory-catalogue-repository";
import { createInventoryLocationRepository } from "@/modules/inventory/repositories/inventory-location-repository";
import { createInventoryBalanceRepository } from "@/modules/inventory/repositories/inventory-balance-repository";
import { createInventoryMovementRepository } from "@/modules/inventory/repositories/inventory-movement-repository";
import { createStockItemLocationRepository } from "@/modules/inventory/repositories/stock-item-location-repository";
import { createStockItemRepository } from "@/modules/inventory/repositories/stock-item-repository";
import { createProductCatalogueAdapter } from "@/modules/inventory/adapters/product-catalogue-adapter";
import { createUnitOfMeasureAdapter } from "@/modules/inventory/adapters/unit-of-measure-adapter";
import {
  assertLocationCode,
  assertLocationName,
  assertLocationType,
  assertParentLocation,
  effectiveStockLevel,
} from "@/modules/inventory/services/inventory-location-rules";
import {
  assertCanRecordOpeningStock,
  assertOpeningStockQuantity,
  openingStockMovementType,
} from "@/modules/inventory/services/opening-stock-rules";
import {
  captureFromCommand,
  createTraceabilityService,
  requireModePort,
} from "@/modules/inventory/services/inventory-traceability-service";
import {
  assertTrackingMode,
  trackingModeOf,
} from "@/modules/inventory/services/inventory-traceability-rules";
import {
  assertBaseUom,
  assertItemType,
  assertProductRef,
  assertSku,
  assertStockedItemAllowed,
  assertValidUnit,
  normalizeOptionalText,
} from "@/modules/inventory/services/stock-item-rules";
import type {
  ConfigureStockItemLocationCommand,
  CreateLocationCommand,
  CreateStockItemCommand,
  InventoryDashboardView,
  InventoryLocationView,
  RecordOpeningStockCommand,
  StockItemDetailView,
  StockItemListView,
  StockItemLocationView,
  UpdateLocationCommand,
  UpdateStockItemCommand,
  UpdateStockItemLocationCommand,
} from "@/modules/inventory/types";

export type InventoryFoundationServiceDependencies = {
  products: InventoryProductCataloguePort;
  units: InventoryUnitCataloguePort;
  catalogues: InventoryTypeCataloguePort;
  stockItems: StockItemRepositoryPort;
  locations: InventoryLocationRepositoryPort;
  itemLocations: StockItemLocationRepositoryPort;
  movements: InventoryMovementRepositoryPort;
  balances: InventoryBalanceRepositoryPort;
  audit: InventoryAuditPort;
  traceability?: InventoryTraceabilityPort | null;
};

function actorId(context: CurrentBusinessContext): string | null {
  return context.platformUserId || null;
}

export class InventoryFoundationService {
  constructor(private readonly deps: InventoryFoundationServiceDependencies) {}

  async getDashboard(context: CurrentBusinessContext): Promise<InventoryDashboardView> {
    const businessId = context.businessId;
    const [stockItems, locations, balances, itemTypes, locationTypes, units, products] =
      await Promise.all([
        this.deps.stockItems.listByBusiness(businessId),
        this.deps.locations.listByBusiness(businessId),
        this.deps.balances.listByBusiness(businessId),
        this.deps.catalogues.listItemTypes(),
        this.deps.catalogues.listLocationTypes(),
        this.deps.units.listActive(businessId),
        this.deps.products.listByBusiness(businessId),
      ]);

    const unitById = new Map(units.map((row) => [row.id, row]));
    const productById = new Map(products.map((row) => [row.id, row]));
    const configsByItem = new Map<string, Awaited<ReturnType<typeof this.deps.itemLocations.listByStockItem>>>();

    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const item of stockItems) {
      if (item.itemTypeCode !== "STOCKED_ITEM" || !item.stockTrackingEnabled) {
        continue;
      }
      const configs =
        configsByItem.get(item.id) ??
        (await this.deps.itemLocations.listByStockItem(businessId, item.id));
      configsByItem.set(item.id, configs);
      for (const config of configs.filter((row) => row.isActive)) {
        const balance = balances.find(
          (row) => row.stockItemId === item.id && row.locationId === config.locationId
        );
        const onHand = balance?.onHand ?? "0";
        const reorder = effectiveStockLevel(config.reorderLevelOverride, item.reorderLevel);
        if (compareInventoryQuantity(onHand, "0") <= 0) {
          outOfStockCount += 1;
        } else if (reorder && compareInventoryQuantity(onHand, reorder) <= 0) {
          lowStockCount += 1;
        }
      }
    }

    const recentStockItems: StockItemListView[] = [];
    for (const item of stockItems.slice(0, 20)) {
      const product = productById.get(item.productId) ?? (await this.deps.products.findById(businessId, item.productId));
      const unit = unitById.get(item.baseUomId) ?? (await this.deps.units.findById(businessId, item.baseUomId));
      recentStockItems.push(this.toListView(item, product?.productName ?? "", product?.productCode ?? "", unit?.code ?? ""));
    }

    return {
      stockItemCount: stockItems.length,
      locationCount: locations.length,
      lowStockCount,
      outOfStockCount,
      recentStockItems,
      locations: locations.map((row) => this.toLocationView(row)),
      itemTypes,
      locationTypes,
      units,
      products,
    };
  }

  async listStockItems(context: CurrentBusinessContext): Promise<StockItemListView[]> {
    const items = await this.deps.stockItems.listByBusiness(context.businessId);
    const views: StockItemListView[] = [];
    for (const item of items) {
      const product = await this.deps.products.findById(context.businessId, item.productId);
      const unit = await this.deps.units.findById(context.businessId, item.baseUomId);
      views.push(
        this.toListView(item, product?.productName ?? "", product?.productCode ?? "", unit?.code ?? "")
      );
    }
    return views;
  }

  async getStockItem(
    context: CurrentBusinessContext,
    stockItemId: string
  ): Promise<StockItemDetailView> {
    const item = await this.requireStockItem(context.businessId, stockItemId);
    return this.toDetailView(context.businessId, item);
  }

  async createStockItem(context: CurrentBusinessContext, command: CreateStockItemCommand) {
    const businessId = context.businessId;
    const sku = assertSku(command.sku);
    const itemTypes = await this.deps.catalogues.listItemTypes();
    assertItemType(command.itemTypeCode, itemTypes);

    const product = assertProductRef(
      await this.deps.products.findById(businessId, command.productId)
    );
    assertStockedItemAllowed(product, command.itemTypeCode);

    const duplicate = await this.deps.stockItems.findActiveByProduct(businessId, product.id);
    if (duplicate) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_STOCK_ITEM);
    }
    const skuTaken = await this.deps.stockItems.findBySku(businessId, sku);
    if (skuTaken) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_SKU, undefined, 409, {
        field: "sku",
      });
    }

    const baseUom = assertBaseUom(await this.deps.units.findById(businessId, command.baseUomId));
    if (command.purchaseUomId) {
      assertValidUnit(await this.deps.units.findById(businessId, command.purchaseUomId), "purchaseUomId");
    }
    if (command.salesUomId) {
      assertValidUnit(await this.deps.units.findById(businessId, command.salesUomId), "salesUomId");
    }

    const created = await this.deps.stockItems.insert({
      businessId,
      productId: product.id,
      sku,
      barcode: normalizeOptionalText(command.barcode),
      stockTrackingEnabled: command.stockTrackingEnabled ?? command.itemTypeCode === "STOCKED_ITEM",
      itemTypeCode: command.itemTypeCode,
      baseUomId: baseUom.id,
      purchaseUomId: command.purchaseUomId ?? null,
      salesUomId: command.salesUomId ?? null,
      conversionFactor: normalizeOptionalText(command.conversionFactor),
      reorderLevel: normalizeOptionalText(command.reorderLevel),
      reorderQuantity: normalizeOptionalText(command.reorderQuantity),
      minimumStockLevel: normalizeOptionalText(command.minimumStockLevel),
      maximumStockLevel: normalizeOptionalText(command.maximumStockLevel),
      safetyStock: normalizeOptionalText(command.safetyStock),
      leadTimeDays: command.leadTimeDays ?? null,
      reviewPeriodDays: command.reviewPeriodDays ?? null,
      trackingMode: assertTrackingMode(command.trackingMode),
      expiryTrackingEnabled: command.expiryTrackingEnabled ?? false,
      allowExpiredFulfilment: command.allowExpiredFulfilment ?? false,
      isActive: true,
      metadata: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });

    await this.deps.audit.record({
      businessId,
      actorUserId: actorId(context),
      entityName: "stock_item",
      entityId: created.id,
      action: INVENTORY_AUDIT_ACTIONS.STOCK_ITEM_CREATED,
      outcome: "SUCCESS",
      references: { productId: product.id, sku: created.sku, itemTypeCode: created.itemTypeCode },
    });

    return this.toDetailView(businessId, created);
  }

  async updateStockItem(
    context: CurrentBusinessContext,
    stockItemId: string,
    command: UpdateStockItemCommand
  ) {
    const businessId = context.businessId;
    const existing = await this.requireStockItem(businessId, stockItemId);
    const movementCountBefore = await this.deps.movements.countByBusiness(businessId);

    let sku = existing.sku;
    if (command.sku !== undefined) {
      sku = assertSku(command.sku);
      const skuTaken = await this.deps.stockItems.findBySku(businessId, sku);
      if (skuTaken && skuTaken.id !== existing.id) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_SKU, undefined, 409, {
          field: "sku",
        });
      }
    }

    if (command.itemTypeCode) {
      const itemTypes = await this.deps.catalogues.listItemTypes();
      assertItemType(command.itemTypeCode, itemTypes);
      const product = assertProductRef(
        await this.deps.products.findById(businessId, existing.productId)
      );
      assertStockedItemAllowed(product, command.itemTypeCode);
    }
    if (command.baseUomId) {
      assertBaseUom(await this.deps.units.findById(businessId, command.baseUomId));
    }
    if (command.purchaseUomId) {
      assertValidUnit(await this.deps.units.findById(businessId, command.purchaseUomId), "purchaseUomId");
    }
    if (command.salesUomId) {
      assertValidUnit(await this.deps.units.findById(businessId, command.salesUomId), "salesUomId");
    }

    const nextTrackingMode = assertTrackingMode(
      command.trackingMode ?? existing.trackingMode
    );
    if (nextTrackingMode !== trackingModeOf(existing)) {
      const itemMovements = await this.deps.movements.listByStockItem(businessId, stockItemId);
      if (itemMovements.length > 0) {
        throw new InventoryError(INVENTORY_ERROR_CODES.TRACKING_MODE_LOCKED);
      }
    }

    const updated = await this.deps.stockItems.update(businessId, stockItemId, {
      sku,
      barcode: command.barcode !== undefined ? normalizeOptionalText(command.barcode) : existing.barcode,
      stockTrackingEnabled: command.stockTrackingEnabled ?? existing.stockTrackingEnabled,
      itemTypeCode: command.itemTypeCode ?? existing.itemTypeCode,
      baseUomId: command.baseUomId ?? existing.baseUomId,
      purchaseUomId:
        command.purchaseUomId !== undefined ? command.purchaseUomId : existing.purchaseUomId,
      salesUomId: command.salesUomId !== undefined ? command.salesUomId : existing.salesUomId,
      conversionFactor:
        command.conversionFactor !== undefined
          ? normalizeOptionalText(command.conversionFactor)
          : existing.conversionFactor,
      reorderLevel:
        command.reorderLevel !== undefined
          ? normalizeOptionalText(command.reorderLevel)
          : existing.reorderLevel,
      reorderQuantity:
        command.reorderQuantity !== undefined
          ? normalizeOptionalText(command.reorderQuantity)
          : existing.reorderQuantity,
      minimumStockLevel:
        command.minimumStockLevel !== undefined
          ? normalizeOptionalText(command.minimumStockLevel)
          : existing.minimumStockLevel,
      maximumStockLevel:
        command.maximumStockLevel !== undefined
          ? normalizeOptionalText(command.maximumStockLevel)
          : existing.maximumStockLevel,
      safetyStock:
        command.safetyStock !== undefined
          ? normalizeOptionalText(command.safetyStock)
          : existing.safetyStock,
      leadTimeDays:
        command.leadTimeDays !== undefined ? command.leadTimeDays : existing.leadTimeDays,
      reviewPeriodDays:
        command.reviewPeriodDays !== undefined
          ? command.reviewPeriodDays
          : existing.reviewPeriodDays,
      trackingMode: nextTrackingMode,
      expiryTrackingEnabled:
        command.expiryTrackingEnabled ?? existing.expiryTrackingEnabled,
      allowExpiredFulfilment:
        command.allowExpiredFulfilment ?? existing.allowExpiredFulfilment,
      updatedBy: actorId(context),
    });

    const movementCountAfter = await this.deps.movements.countByBusiness(businessId);
    if (movementCountAfter !== movementCountBefore) {
      throw new InventoryError(INVENTORY_ERROR_CODES.MOVEMENT_NOT_ALLOWED);
    }

    await this.deps.audit.record({
      businessId,
      actorUserId: actorId(context),
      entityName: "stock_item",
      entityId: updated.id,
      action:
        nextTrackingMode !== trackingModeOf(existing)
          ? INVENTORY_AUDIT_ACTIONS.TRACKING_MODE_CHANGED
          : INVENTORY_AUDIT_ACTIONS.STOCK_ITEM_UPDATED,
      outcome: "SUCCESS",
      references: { sku: updated.sku, trackingMode: updated.trackingMode },
    });

    return this.toDetailView(businessId, updated);
  }

  async setStockItemActive(
    context: CurrentBusinessContext,
    stockItemId: string,
    isActive: boolean
  ) {
    const existing = await this.requireStockItem(context.businessId, stockItemId);
    if (isActive) {
      const duplicate = await this.deps.stockItems.findActiveByProduct(
        context.businessId,
        existing.productId
      );
      if (duplicate && duplicate.id !== existing.id) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_STOCK_ITEM);
      }
    }
    const updated = await this.deps.stockItems.update(context.businessId, stockItemId, {
      isActive,
      updatedBy: actorId(context),
    });
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityName: "stock_item",
      entityId: updated.id,
      action: isActive
        ? INVENTORY_AUDIT_ACTIONS.STOCK_ITEM_ACTIVATED
        : INVENTORY_AUDIT_ACTIONS.STOCK_ITEM_DEACTIVATED,
      outcome: "SUCCESS",
    });
    return this.toDetailView(context.businessId, updated);
  }

  async listLocations(context: CurrentBusinessContext): Promise<InventoryLocationView[]> {
    const rows = await this.deps.locations.listByBusiness(context.businessId);
    return rows.map((row) => this.toLocationView(row));
  }

  async getLocation(context: CurrentBusinessContext, locationId: string) {
    const row = await this.requireLocation(context.businessId, locationId);
    return this.toLocationView(row);
  }

  async createLocation(context: CurrentBusinessContext, command: CreateLocationCommand) {
    const businessId = context.businessId;
    const code = assertLocationCode(command.code);
    const name = assertLocationName(command.name);
    const types = await this.deps.catalogues.listLocationTypes();
    assertLocationType(command.locationTypeCode, types);

    const duplicate = await this.deps.locations.findByCode(businessId, code);
    if (duplicate) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_LOCATION_CODE, undefined, 409, {
        field: "code",
      });
    }
    if (command.parentLocationId) {
      assertParentLocation(await this.deps.locations.findById(businessId, command.parentLocationId));
    }

    const created = await this.deps.locations.insert({
      businessId,
      code,
      name,
      description: normalizeOptionalText(command.description),
      locationTypeCode: command.locationTypeCode,
      parentLocationId: command.parentLocationId ?? null,
      isActive: true,
      metadata: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });

    await this.deps.audit.record({
      businessId,
      actorUserId: actorId(context),
      entityName: "inventory_location",
      entityId: created.id,
      action: INVENTORY_AUDIT_ACTIONS.INVENTORY_LOCATION_CREATED,
      outcome: "SUCCESS",
      references: { code: created.code, locationTypeCode: created.locationTypeCode },
    });

    return this.toLocationView(created);
  }

  async updateLocation(
    context: CurrentBusinessContext,
    locationId: string,
    command: UpdateLocationCommand
  ) {
    const businessId = context.businessId;
    const existing = await this.requireLocation(businessId, locationId);
    const movementCountBefore = await this.deps.movements.countByBusiness(businessId);

    let code = existing.code;
    if (command.code !== undefined) {
      code = assertLocationCode(command.code);
      const taken = await this.deps.locations.findByCode(businessId, code);
      if (taken && taken.id !== existing.id) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_LOCATION_CODE, undefined, 409, {
          field: "code",
        });
      }
    }
    if (command.locationTypeCode) {
      const types = await this.deps.catalogues.listLocationTypes();
      assertLocationType(command.locationTypeCode, types);
    }
    if (command.parentLocationId) {
      assertParentLocation(
        await this.deps.locations.findById(businessId, command.parentLocationId),
        locationId
      );
    }

    const updated = await this.deps.locations.update(businessId, locationId, {
      code,
      name: command.name !== undefined ? assertLocationName(command.name) : existing.name,
      description:
        command.description !== undefined
          ? normalizeOptionalText(command.description)
          : existing.description,
      locationTypeCode: command.locationTypeCode ?? existing.locationTypeCode,
      parentLocationId:
        command.parentLocationId !== undefined
          ? command.parentLocationId
          : existing.parentLocationId,
      updatedBy: actorId(context),
    });

    const movementCountAfter = await this.deps.movements.countByBusiness(businessId);
    if (movementCountAfter !== movementCountBefore) {
      throw new InventoryError(INVENTORY_ERROR_CODES.MOVEMENT_NOT_ALLOWED);
    }

    await this.deps.audit.record({
      businessId,
      actorUserId: actorId(context),
      entityName: "inventory_location",
      entityId: updated.id,
      action: INVENTORY_AUDIT_ACTIONS.INVENTORY_LOCATION_UPDATED,
      outcome: "SUCCESS",
    });

    return this.toLocationView(updated);
  }

  async setLocationActive(
    context: CurrentBusinessContext,
    locationId: string,
    isActive: boolean
  ) {
    await this.requireLocation(context.businessId, locationId);
    const updated = await this.deps.locations.update(context.businessId, locationId, {
      isActive,
      updatedBy: actorId(context),
    });
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityName: "inventory_location",
      entityId: updated.id,
      action: isActive
        ? INVENTORY_AUDIT_ACTIONS.INVENTORY_LOCATION_ACTIVATED
        : INVENTORY_AUDIT_ACTIONS.INVENTORY_LOCATION_DEACTIVATED,
      outcome: "SUCCESS",
    });
    return this.toLocationView(updated);
  }

  async configureStockItemLocation(
    context: CurrentBusinessContext,
    command: ConfigureStockItemLocationCommand
  ) {
    const businessId = context.businessId;
    const item = await this.requireStockItem(businessId, command.stockItemId);
    await this.requireLocation(businessId, command.locationId);
    const existing = await this.deps.itemLocations.findByItemAndLocation(
      businessId,
      command.stockItemId,
      command.locationId
    );
    if (existing) {
      const updated = await this.deps.itemLocations.update(businessId, existing.id, {
        isActive: true,
        reorderLevelOverride: normalizeOptionalText(command.reorderLevelOverride),
        minimumStockLevelOverride: normalizeOptionalText(command.minimumStockLevelOverride),
        maximumStockLevelOverride: normalizeOptionalText(command.maximumStockLevelOverride),
        reorderQuantityOverride: normalizeOptionalText(command.reorderQuantityOverride),
        safetyStockOverride: normalizeOptionalText(command.safetyStockOverride),
        updatedBy: actorId(context),
      });
      await this.deps.audit.record({
        businessId,
        actorUserId: actorId(context),
        entityName: "stock_item_location",
        entityId: updated.id,
        action: INVENTORY_AUDIT_ACTIONS.STOCK_ITEM_LOCATION_UPDATED,
        outcome: "SUCCESS",
        references: { stockItemId: item.id, locationId: command.locationId },
      });
      return this.toDetailView(businessId, item);
    }

    const created = await this.deps.itemLocations.insert({
      businessId,
      stockItemId: command.stockItemId,
      locationId: command.locationId,
      isActive: true,
      reorderLevelOverride: normalizeOptionalText(command.reorderLevelOverride),
      minimumStockLevelOverride: normalizeOptionalText(command.minimumStockLevelOverride),
      maximumStockLevelOverride: normalizeOptionalText(command.maximumStockLevelOverride),
      reorderQuantityOverride: normalizeOptionalText(command.reorderQuantityOverride),
      safetyStockOverride: normalizeOptionalText(command.safetyStockOverride),
      metadata: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.deps.audit.record({
      businessId,
      actorUserId: actorId(context),
      entityName: "stock_item_location",
      entityId: created.id,
      action: INVENTORY_AUDIT_ACTIONS.STOCK_ITEM_LOCATION_CONFIGURED,
      outcome: "SUCCESS",
      references: { stockItemId: item.id, locationId: command.locationId },
    });
    return this.toDetailView(businessId, item);
  }

  async updateStockItemLocation(
    context: CurrentBusinessContext,
    configId: string,
    command: UpdateStockItemLocationCommand
  ) {
    const existing = await this.deps.itemLocations.findById(context.businessId, configId);
    if (!existing) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCK_ITEM_LOCATION_NOT_FOUND, undefined, 404);
    }
    const updated = await this.deps.itemLocations.update(context.businessId, configId, {
      isActive: command.isActive ?? existing.isActive,
      reorderLevelOverride:
        command.reorderLevelOverride !== undefined
          ? normalizeOptionalText(command.reorderLevelOverride)
          : existing.reorderLevelOverride,
      minimumStockLevelOverride:
        command.minimumStockLevelOverride !== undefined
          ? normalizeOptionalText(command.minimumStockLevelOverride)
          : existing.minimumStockLevelOverride,
      maximumStockLevelOverride:
        command.maximumStockLevelOverride !== undefined
          ? normalizeOptionalText(command.maximumStockLevelOverride)
          : existing.maximumStockLevelOverride,
      reorderQuantityOverride:
        command.reorderQuantityOverride !== undefined
          ? normalizeOptionalText(command.reorderQuantityOverride)
          : existing.reorderQuantityOverride,
      safetyStockOverride:
        command.safetyStockOverride !== undefined
          ? normalizeOptionalText(command.safetyStockOverride)
          : existing.safetyStockOverride,
      updatedBy: actorId(context),
    });
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityName: "stock_item_location",
      entityId: updated.id,
      action: INVENTORY_AUDIT_ACTIONS.STOCK_ITEM_LOCATION_UPDATED,
      outcome: "SUCCESS",
    });
    const item = await this.requireStockItem(context.businessId, existing.stockItemId);
    return this.toDetailView(context.businessId, item);
  }

  async recordOpeningStock(context: CurrentBusinessContext, command: RecordOpeningStockCommand) {
    const businessId = context.businessId;
    const quantity = assertOpeningStockQuantity(command.quantity);
    const stockItem = await this.requireStockItem(businessId, command.stockItemId);
    const location = await this.requireLocation(businessId, command.locationId);
    const product = assertProductRef(
      await this.deps.products.findById(businessId, stockItem.productId)
    );
    const config = await this.deps.itemLocations.findByItemAndLocation(
      businessId,
      stockItem.id,
      location.id
    );
    const existingOpening = await this.deps.movements.findOpeningStock(
      businessId,
      stockItem.id,
      location.id
    );
    assertCanRecordOpeningStock({
      stockItem,
      product,
      location,
      config,
      existingOpening,
    });
    assertBaseUom(await this.deps.units.findById(businessId, stockItem.baseUomId));

    const movementType = openingStockMovementType();
    if (movementType !== INVENTORY_IP01_MOVEMENT_TYPES.OPENING_STOCK) {
      throw new InventoryError(INVENTORY_ERROR_CODES.MOVEMENT_NOT_ALLOWED);
    }

    const existingBalance = await this.deps.balances.findByItemAndLocation(
      businessId,
      stockItem.id,
      location.id
    );
    if (existingBalance) {
      throw new InventoryError(INVENTORY_ERROR_CODES.OPENING_STOCK_ALREADY_RECORDED);
    }

    const movement = await this.deps.movements.insert({
      id: randomUUID(),
      businessId,
      stockItemId: stockItem.id,
      locationId: location.id,
      movementType: INVENTORY_MOVEMENT_TYPES.OPENING_STOCK,
      quantity,
      uomId: stockItem.baseUomId,
      reason: normalizeOptionalText(command.reason),
      metadata: null,
      createdBy: actorId(context),
    });

    const derived = openingStockBalance(quantity);
    await this.deps.balances.insert({
      businessId,
      stockItemId: stockItem.id,
      locationId: location.id,
      onHand: derived.onHand,
      reserved: derived.reserved,
      available: derived.available,
      metadata: { openingMovementId: movement.id },
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });

    await this.deps.audit.record({
      businessId,
      actorUserId: actorId(context),
      entityName: "inventory_movement",
      entityId: movement.id,
      action: INVENTORY_AUDIT_ACTIONS.OPENING_STOCK_RECORDED,
      outcome: "SUCCESS",
      reason: movement.reason,
      references: {
        stockItemId: stockItem.id,
        locationId: location.id,
        quantity,
        movementType: movement.movementType,
      },
    });

    requireModePort(trackingModeOf(stockItem), this.deps.traceability);
    await this.deps.traceability?.captureLine(context, {
      sourceType: "OPENING_STOCK",
      sourceId: movement.id,
      sourceLineId: movement.id,
      stockItem,
      capture: captureFromCommand(command),
      baseQuantity: quantity,
      direction: "IN",
    });
    await this.deps.traceability?.applyInbound({
      context,
      stockItem,
      locationId: location.id,
      movementId: movement.id,
      sourceType: "OPENING_STOCK",
      sourceId: movement.id,
      sourceLineId: movement.id,
      baseQuantity: quantity,
      capture: captureFromCommand(command),
    });

    return this.toDetailView(businessId, stockItem);
  }

  private async requireStockItem(businessId: string, stockItemId: string) {
    const row = await this.deps.stockItems.findById(businessId, stockItemId);
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCK_ITEM_NOT_FOUND, undefined, 404);
    }
    return row;
  }

  private async requireLocation(businessId: string, locationId: string) {
    const row = await this.deps.locations.findById(businessId, locationId);
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LOCATION_NOT_FOUND, undefined, 404);
    }
    return row;
  }

  private toListView(
    item: Awaited<ReturnType<StockItemRepositoryPort["insert"]>>,
    productName: string,
    productCode: string,
    baseUomCode: string
  ): StockItemListView {
    return {
      id: item.id,
      sku: item.sku,
      productId: item.productId,
      productName,
      productCode,
      itemTypeCode: item.itemTypeCode,
      itemTypeLabel:
        STOCK_ITEM_TYPE_LABELS[item.itemTypeCode as keyof typeof STOCK_ITEM_TYPE_LABELS] ??
        item.itemTypeCode,
      baseUomCode,
      stockTrackingEnabled: item.stockTrackingEnabled,
      trackingMode: item.trackingMode,
      isActive: item.isActive,
    };
  }

  private toLocationView(
    row: Awaited<ReturnType<InventoryLocationRepositoryPort["insert"]>>
  ): InventoryLocationView {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      locationTypeCode: row.locationTypeCode,
      locationTypeLabel:
        INVENTORY_LOCATION_TYPE_LABELS[
          row.locationTypeCode as keyof typeof INVENTORY_LOCATION_TYPE_LABELS
        ] ?? row.locationTypeCode,
      parentLocationId: row.parentLocationId,
      isActive: row.isActive,
    };
  }

  private async toDetailView(
    businessId: string,
    item: Awaited<ReturnType<StockItemRepositoryPort["insert"]>>
  ): Promise<StockItemDetailView> {
    const product = await this.deps.products.findById(businessId, item.productId);
    const unit = await this.deps.units.findById(businessId, item.baseUomId);
    const configs = await this.deps.itemLocations.listByStockItem(businessId, item.id);
    const balances = await this.deps.balances.listByStockItem(businessId, item.id);
    const locations: StockItemLocationView[] = [];
    for (const config of configs) {
      const location = await this.deps.locations.findById(businessId, config.locationId);
      const balance = balances.find((row) => row.locationId === config.locationId);
      locations.push({
        id: config.id,
        locationId: config.locationId,
        locationCode: location?.code ?? "",
        locationName: location?.name ?? "",
        isActive: config.isActive,
        reorderLevel: effectiveStockLevel(config.reorderLevelOverride, item.reorderLevel),
        minimumStockLevel: effectiveStockLevel(
          config.minimumStockLevelOverride,
          item.minimumStockLevel
        ),
        maximumStockLevel: effectiveStockLevel(
          config.maximumStockLevelOverride,
          item.maximumStockLevel
        ),
        onHand: balance?.onHand ?? "0",
        reserved: balance?.reserved ?? "0",
        available: balance?.available ?? deriveAvailableQuantity(balance?.onHand ?? "0", "0"),
      });
    }

    let onHandScaled = 0;
    let reservedScaled = 0;
    for (const row of locations) {
      onHandScaled += Number(row.onHand);
      reservedScaled += Number(row.reserved);
    }

    return {
      id: item.id,
      productId: item.productId,
      productName: product?.productName ?? "",
      productCode: product?.productCode ?? "",
      productTypeCode: product?.productTypeCode ?? "",
      sku: item.sku,
      barcode: item.barcode,
      stockTrackingEnabled: item.stockTrackingEnabled,
      itemTypeCode: item.itemTypeCode,
      itemTypeLabel:
        STOCK_ITEM_TYPE_LABELS[item.itemTypeCode as keyof typeof STOCK_ITEM_TYPE_LABELS] ??
        item.itemTypeCode,
      baseUomId: item.baseUomId,
      baseUomCode: unit?.code ?? "",
      purchaseUomId: item.purchaseUomId,
      salesUomId: item.salesUomId,
      conversionFactor: item.conversionFactor,
      reorderLevel: item.reorderLevel,
      reorderQuantity: item.reorderQuantity,
      minimumStockLevel: item.minimumStockLevel,
      maximumStockLevel: item.maximumStockLevel,
      safetyStock: item.safetyStock,
      leadTimeDays: item.leadTimeDays,
      reviewPeriodDays: item.reviewPeriodDays,
      trackingMode: item.trackingMode,
      expiryTrackingEnabled: item.expiryTrackingEnabled,
      allowExpiredFulfilment: item.allowExpiredFulfilment,
      isActive: item.isActive,
      locations,
      totalOnHand: String(onHandScaled),
      totalReserved: String(reservedScaled),
      totalAvailable: String(onHandScaled - reservedScaled),
    };
  }
}

export function createDefaultInventoryFoundationDependencies(): InventoryFoundationServiceDependencies {
  return {
    products: createProductCatalogueAdapter(),
    units: createUnitOfMeasureAdapter(),
    catalogues: createInventoryCatalogueRepository(),
    stockItems: createStockItemRepository(),
    locations: createInventoryLocationRepository(),
    itemLocations: createStockItemLocationRepository(),
    movements: createInventoryMovementRepository(),
    balances: createInventoryBalanceRepository(),
    audit: createInventoryAuditAdapter(),
    traceability: createTraceabilityService(),
  };
}

export function createInventoryFoundationService(
  deps?: InventoryFoundationServiceDependencies
) {
  return new InventoryFoundationService(
    deps ?? createDefaultInventoryFoundationDependencies()
  );
}
