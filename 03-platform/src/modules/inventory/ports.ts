/**
 * Purpose:
 * Injectable ports for BP-008 inventory foundation.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import type {
  CatalogueTypeRef,
  InventoryAuditRecord,
  InventoryBalanceInsert,
  InventoryBalanceRecord,
  InventoryIdempotencyInsert,
  InventoryIdempotencyRecord,
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
  InventorySalesFulfilmentContract,
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
  InventorySupplierRef,
  InventoryUnitRef,
  InventoryLineTraceInsert,
  InventoryLineTraceRecord,
  InventoryLotInsert,
  InventoryLotPatch,
  InventoryLotRecord,
  InventoryTraceAllocationInsert,
  InventoryTraceAllocationRecord,
  InventoryTraceCapture,
  InventoryLotView,
  InventoryTrackedUnitView,
  InventoryTraceEventView,
  InventoryTraceabilitySearchQuery,
  InventoryTrackedUnitInsert,
  InventoryTrackedUnitPatch,
  InventoryTrackedUnitRecord,
  InventoryReplenishmentAdviceInsert,
  InventoryReplenishmentAdvicePatch,
  InventoryReplenishmentAdviceRecord,
  InventoryControlChangeInsert,
  InventoryControlChangePatch,
  InventoryControlChangeRecord,
  InventoryOpsIncidentInsert,
  InventoryOpsIncidentPatch,
  InventoryOpsIncidentRecord,
  InventoryOpsIncidentEventInsert,
  InventoryOpsIncidentEventRecord,
  InventoryOpsIncidentTypeRef,
  InventoryOpsIncidentView,
  InventoryTransferInsert,
  InventoryTransferLineInsert,
  InventoryTransferLinePatch,
  InventoryTransferLineRecord,
  InventoryTransferPatch,
  InventoryTransferRecord,
  RecordOpsIncidentCommand,
  StockItemInsert,
  StockItemLocationInsert,
  StockItemLocationPatch,
  StockItemLocationRecord,
  StockItemPatch,
  StockItemRecord,
} from "@/modules/inventory/types";

export type InventoryProductCataloguePort = {
  findById(businessId: string, productId: string): Promise<InventoryProductRef | null>;
  listByBusiness(businessId: string): Promise<InventoryProductRef[]>;
};

export type InventoryUnitCataloguePort = {
  findById(businessId: string, unitId: string): Promise<InventoryUnitRef | null>;
  listActive(businessId: string): Promise<InventoryUnitRef[]>;
};

export type InventoryTypeCataloguePort = {
  listItemTypes(): Promise<CatalogueTypeRef[]>;
  findItemType(code: string): Promise<CatalogueTypeRef | null>;
  listLocationTypes(): Promise<CatalogueTypeRef[]>;
  findLocationType(code: string): Promise<CatalogueTypeRef | null>;
};

export type InventoryAuditPort = {
  record(entry: InventoryAuditRecord): Promise<void>;
};

export type StockItemRepositoryPort = {
  insert(values: StockItemInsert): Promise<StockItemRecord>;
  update(
    businessId: string,
    stockItemId: string,
    patch: StockItemPatch
  ): Promise<StockItemRecord>;
  findById(businessId: string, stockItemId: string): Promise<StockItemRecord | null>;
  findActiveByProduct(
    businessId: string,
    productId: string
  ): Promise<StockItemRecord | null>;
  findBySku(businessId: string, sku: string): Promise<StockItemRecord | null>;
  listByBusiness(businessId: string): Promise<StockItemRecord[]>;
};

export type InventoryLocationRepositoryPort = {
  insert(values: InventoryLocationInsert): Promise<InventoryLocationRecord>;
  update(
    businessId: string,
    locationId: string,
    patch: InventoryLocationPatch
  ): Promise<InventoryLocationRecord>;
  findById(
    businessId: string,
    locationId: string
  ): Promise<InventoryLocationRecord | null>;
  findByCode(
    businessId: string,
    code: string
  ): Promise<InventoryLocationRecord | null>;
  listByBusiness(businessId: string): Promise<InventoryLocationRecord[]>;
};

export type StockItemLocationRepositoryPort = {
  insert(values: StockItemLocationInsert): Promise<StockItemLocationRecord>;
  update(
    businessId: string,
    configId: string,
    patch: StockItemLocationPatch
  ): Promise<StockItemLocationRecord>;
  findById(
    businessId: string,
    configId: string
  ): Promise<StockItemLocationRecord | null>;
  findByItemAndLocation(
    businessId: string,
    stockItemId: string,
    locationId: string
  ): Promise<StockItemLocationRecord | null>;
  listByStockItem(
    businessId: string,
    stockItemId: string
  ): Promise<StockItemLocationRecord[]>;
  listByLocation(
    businessId: string,
    locationId: string
  ): Promise<StockItemLocationRecord[]>;
};

export type InventoryMovementRepositoryPort = {
  insert(values: InventoryMovementInsert): Promise<InventoryMovementRecord>;
  findOpeningStock(
    businessId: string,
    stockItemId: string,
    locationId: string
  ): Promise<InventoryMovementRecord | null>;
  listByStockItem(
    businessId: string,
    stockItemId: string
  ): Promise<InventoryMovementRecord[]>;
  listByLocation(
    businessId: string,
    locationId: string
  ): Promise<InventoryMovementRecord[]>;
  countByBusiness(businessId: string): Promise<number>;
};

export type InventoryBalanceRepositoryPort = {
  insert(values: InventoryBalanceInsert): Promise<InventoryBalanceRecord>;
  applyInboundOnHand(
    businessId: string,
    stockItemId: string,
    locationId: string,
    inboundQuantity: string,
    actorId: string | null
  ): Promise<InventoryBalanceRecord>;
  applyReservationHold(
    businessId: string,
    stockItemId: string,
    locationId: string,
    reservedDelta: string,
    actorId: string | null
  ): Promise<InventoryBalanceRecord>;
  applySaleDeduction(
    businessId: string,
    stockItemId: string,
    locationId: string,
    deductedQuantity: string,
    actorId: string | null
  ): Promise<InventoryBalanceRecord>;
  applyOutboundOnHand(
    businessId: string,
    stockItemId: string,
    locationId: string,
    outboundQuantity: string,
    actorId: string | null
  ): Promise<InventoryBalanceRecord>;
  findByItemAndLocation(
    businessId: string,
    stockItemId: string,
    locationId: string
  ): Promise<InventoryBalanceRecord | null>;
  listByStockItem(
    businessId: string,
    stockItemId: string
  ): Promise<InventoryBalanceRecord[]>;
  listByBusiness(businessId: string): Promise<InventoryBalanceRecord[]>;
};

export type InventoryOperationControlPort = {
  getControl(
    businessId: string,
    operationCode: string
  ): Promise<InventoryOperationControl | null>;
};

export type InventorySupplierPort = {
  findActiveSupplier(
    businessId: string,
    partyId: string
  ): Promise<InventorySupplierRef | null>;
  listActiveSuppliers(businessId: string): Promise<InventorySupplierRef[]>;
};

export type InventoryLockPort = {
  runExclusive<T>(key: string, work: () => Promise<T>): Promise<T>;
};

export type InventoryIdempotencyPort = {
  insert(values: InventoryIdempotencyInsert): Promise<InventoryIdempotencyRecord>;
  find(
    businessId: string,
    operationType: string,
    idempotencyKey: string
  ): Promise<InventoryIdempotencyRecord | null>;
};

export type InventoryReceiptRepositoryPort = {
  insert(values: InventoryReceiptInsert): Promise<InventoryReceiptRecord>;
  update(
    businessId: string,
    receiptId: string,
    patch: InventoryReceiptPatch
  ): Promise<InventoryReceiptRecord>;
  findById(businessId: string, receiptId: string): Promise<InventoryReceiptRecord | null>;
  listByBusiness(businessId: string): Promise<InventoryReceiptRecord[]>;
};

export type InventoryReceiptLineRepositoryPort = {
  insert(values: InventoryInboundLineInsert): Promise<InventoryInboundLineRecord>;
  update(
    businessId: string,
    lineId: string,
    patch: InventoryInboundLinePatch
  ): Promise<InventoryInboundLineRecord>;
  findById(businessId: string, lineId: string): Promise<InventoryInboundLineRecord | null>;
  listByHeader(businessId: string, headerId: string): Promise<InventoryInboundLineRecord[]>;
};

export type InventoryOpeningBalanceRepositoryPort = {
  insert(values: InventoryOpeningBalanceInsert): Promise<InventoryOpeningBalanceRecord>;
  update(
    businessId: string,
    openingId: string,
    patch: InventoryOpeningBalancePatch
  ): Promise<InventoryOpeningBalanceRecord>;
  findById(
    businessId: string,
    openingId: string
  ): Promise<InventoryOpeningBalanceRecord | null>;
  listByBusiness(businessId: string): Promise<InventoryOpeningBalanceRecord[]>;
};

export type InventoryOpeningBalanceLineRepositoryPort = {
  insert(values: InventoryInboundLineInsert): Promise<InventoryInboundLineRecord>;
  update(
    businessId: string,
    lineId: string,
    patch: InventoryInboundLinePatch
  ): Promise<InventoryInboundLineRecord>;
  findById(businessId: string, lineId: string): Promise<InventoryInboundLineRecord | null>;
  listByHeader(businessId: string, headerId: string): Promise<InventoryInboundLineRecord[]>;
};

export type InventoryReservationRepositoryPort = {
  insert(values: InventoryReservationInsert): Promise<InventoryReservationRecord>;
  update(
    businessId: string,
    reservationId: string,
    patch: InventoryReservationPatch
  ): Promise<InventoryReservationRecord>;
  findById(businessId: string, reservationId: string): Promise<InventoryReservationRecord | null>;
  findByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<InventoryReservationRecord | null>;
  findActiveBySaleLine(
    businessId: string,
    salesOrderLineId: string
  ): Promise<InventoryReservationRecord | null>;
  listByBusiness(businessId: string): Promise<InventoryReservationRecord[]>;
  listActiveByItemLocation(
    businessId: string,
    stockItemId: string,
    locationId: string
  ): Promise<InventoryReservationRecord[]>;
};

export type InventoryFulfilmentRepositoryPort = {
  insert(values: InventoryFulfilmentInsert): Promise<InventoryFulfilmentRecord>;
  findByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<InventoryFulfilmentRecord | null>;
  listByReservation(
    businessId: string,
    reservationId: string
  ): Promise<InventoryFulfilmentRecord[]>;
};

export type InventorySalesFulfilmentPort = {
  getByOrderId(
    context: { businessId: string; platformUserId: string | null; businessMembershipId: string },
    orderId: string
  ): Promise<InventorySalesFulfilmentContract | null>;
};

export type InventoryAdjustmentRepositoryPort = {
  insert(values: InventoryAdjustmentInsert): Promise<InventoryAdjustmentRecord>;
  update(
    businessId: string,
    adjustmentId: string,
    patch: InventoryAdjustmentPatch
  ): Promise<InventoryAdjustmentRecord>;
  findById(businessId: string, adjustmentId: string): Promise<InventoryAdjustmentRecord | null>;
  findByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<InventoryAdjustmentRecord | null>;
  listByBusiness(businessId: string): Promise<InventoryAdjustmentRecord[]>;
};

export type InventoryAdjustmentLineRepositoryPort = {
  insert(values: InventoryAdjustmentLineInsert): Promise<InventoryAdjustmentLineRecord>;
  update(
    businessId: string,
    lineId: string,
    patch: InventoryAdjustmentLinePatch
  ): Promise<InventoryAdjustmentLineRecord>;
  findById(businessId: string, lineId: string): Promise<InventoryAdjustmentLineRecord | null>;
  listByHeader(businessId: string, headerId: string): Promise<InventoryAdjustmentLineRecord[]>;
};

export type InventoryStocktakeRepositoryPort = {
  insert(values: InventoryStocktakeInsert): Promise<InventoryStocktakeRecord>;
  update(
    businessId: string,
    stocktakeId: string,
    patch: InventoryStocktakePatch
  ): Promise<InventoryStocktakeRecord>;
  findById(businessId: string, stocktakeId: string): Promise<InventoryStocktakeRecord | null>;
  findByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<InventoryStocktakeRecord | null>;
  listByBusiness(businessId: string): Promise<InventoryStocktakeRecord[]>;
};

export type InventoryStocktakeLineRepositoryPort = {
  insert(values: InventoryStocktakeLineInsert): Promise<InventoryStocktakeLineRecord>;
  update(
    businessId: string,
    lineId: string,
    patch: InventoryStocktakeLinePatch
  ): Promise<InventoryStocktakeLineRecord>;
  findById(businessId: string, lineId: string): Promise<InventoryStocktakeLineRecord | null>;
  listByHeader(businessId: string, headerId: string): Promise<InventoryStocktakeLineRecord[]>;
};

export type InventoryStocktakeCountRepositoryPort = {
  insert(values: InventoryStocktakeCountInsert): Promise<InventoryStocktakeCountRecord>;
  listByLine(businessId: string, lineId: string): Promise<InventoryStocktakeCountRecord[]>;
};

export type InventoryLotRepositoryPort = {
  insert(values: InventoryLotInsert): Promise<InventoryLotRecord>;
  update(businessId: string, lotId: string, patch: InventoryLotPatch): Promise<InventoryLotRecord>;
  findById(businessId: string, lotId: string): Promise<InventoryLotRecord | null>;
  findByCode(
    businessId: string,
    stockItemId: string,
    lotCode: string
  ): Promise<InventoryLotRecord | null>;
  listByItem(businessId: string, stockItemId: string): Promise<InventoryLotRecord[]>;
  listByBusiness(businessId: string): Promise<InventoryLotRecord[]>;
};

export type InventoryTrackedUnitRepositoryPort = {
  insert(values: InventoryTrackedUnitInsert): Promise<InventoryTrackedUnitRecord>;
  update(
    businessId: string,
    unitId: string,
    patch: InventoryTrackedUnitPatch
  ): Promise<InventoryTrackedUnitRecord>;
  findById(businessId: string, unitId: string): Promise<InventoryTrackedUnitRecord | null>;
  findByCode(businessId: string, unitCode: string): Promise<InventoryTrackedUnitRecord | null>;
  listByItem(businessId: string, stockItemId: string): Promise<InventoryTrackedUnitRecord[]>;
  listByBusiness(businessId: string): Promise<InventoryTrackedUnitRecord[]>;
};

export type InventoryLineTraceRepositoryPort = {
  insert(values: InventoryLineTraceInsert): Promise<InventoryLineTraceRecord>;
  findBySourceLine(
    businessId: string,
    sourceType: string,
    sourceLineId: string
  ): Promise<InventoryLineTraceRecord | null>;
  listByStockItem(businessId: string, stockItemId: string): Promise<InventoryLineTraceRecord[]>;
};

export type InventoryTraceAllocationRepositoryPort = {
  insert(values: InventoryTraceAllocationInsert): Promise<InventoryTraceAllocationRecord>;
  listByMovement(businessId: string, movementId: string): Promise<InventoryTraceAllocationRecord[]>;
  listByLot(businessId: string, lotId: string): Promise<InventoryTraceAllocationRecord[]>;
  listByTrackedUnit(
    businessId: string,
    trackedUnitId: string
  ): Promise<InventoryTraceAllocationRecord[]>;
  listByItem(businessId: string, stockItemId: string): Promise<InventoryTraceAllocationRecord[]>;
};

export type InventoryTraceApplyInput = {
  context: CurrentBusinessContext;
  stockItem: StockItemRecord;
  locationId: string;
  movementId: string;
  sourceType: string;
  sourceId: string;
  sourceLineId: string;
  baseQuantity: string;
  capture?: InventoryTraceCapture | null;
  unitStatus?: string;
  enforceExpiry?: boolean;
  reservationId?: string | null;
};

export type InventoryTraceabilityPort = {
  captureLine(
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
  ): Promise<InventoryLineTraceRecord | null>;
  getCapture(
    context: CurrentBusinessContext,
    sourceType: string,
    sourceLineId: string
  ): Promise<InventoryTraceCapture | null>;
  applyInbound(input: InventoryTraceApplyInput): Promise<void>;
  applyOutbound(input: InventoryTraceApplyInput): Promise<void>;
  reserveUnits(input: {
    context: CurrentBusinessContext;
    stockItem: StockItemRecord;
    locationId: string;
    sourceType: string;
    sourceId: string;
    sourceLineId: string;
    capture: InventoryTraceCapture | null | undefined;
    baseQuantity: string;
  }): Promise<void>;
  releaseUnits(input: {
    context: CurrentBusinessContext;
    stockItem: StockItemRecord;
    sourceId: string;
  }): Promise<void>;
  search(
    context: CurrentBusinessContext,
    query: InventoryTraceabilitySearchQuery
  ): Promise<{ lots: InventoryLotView[]; units: InventoryTrackedUnitView[] }>;
  getLotDetail(
    context: CurrentBusinessContext,
    lotId: string
  ): Promise<{ lot: InventoryLotView; history: InventoryTraceEventView[] }>;
  getUnitDetail(
    context: CurrentBusinessContext,
    unitId: string
  ): Promise<{ unit: InventoryTrackedUnitView; history: InventoryTraceEventView[] }>;
};

export type InventoryReplenishmentAdviceRepositoryPort = {
  insert(
    values: InventoryReplenishmentAdviceInsert
  ): Promise<InventoryReplenishmentAdviceRecord>;
  update(
    businessId: string,
    adviceId: string,
    patch: InventoryReplenishmentAdvicePatch
  ): Promise<InventoryReplenishmentAdviceRecord>;
  findById(
    businessId: string,
    adviceId: string
  ): Promise<InventoryReplenishmentAdviceRecord | null>;
  findActive(
    businessId: string,
    stockItemId: string,
    locationId: string,
    conditionCode: string
  ): Promise<InventoryReplenishmentAdviceRecord | null>;
  listByBusiness(businessId: string): Promise<InventoryReplenishmentAdviceRecord[]>;
};

export type InventoryControlChangeRepositoryPort = {
  insert(values: InventoryControlChangeInsert): Promise<InventoryControlChangeRecord>;
  update(
    businessId: string,
    changeId: string,
    patch: InventoryControlChangePatch
  ): Promise<InventoryControlChangeRecord>;
  findById(
    businessId: string,
    changeId: string
  ): Promise<InventoryControlChangeRecord | null>;
  listByBusiness(businessId: string): Promise<InventoryControlChangeRecord[]>;
  listPendingByItem(
    businessId: string,
    stockItemId: string
  ): Promise<InventoryControlChangeRecord[]>;
};

export type InventoryOpsIncidentTypeCataloguePort = {
  listActive(): Promise<InventoryOpsIncidentTypeRef[]>;
};

export type InventoryOpsIncidentRepositoryPort = {
  insert(values: InventoryOpsIncidentInsert): Promise<InventoryOpsIncidentRecord>;
  update(
    businessId: string,
    incidentId: string,
    patch: InventoryOpsIncidentPatch
  ): Promise<InventoryOpsIncidentRecord>;
  findById(businessId: string, incidentId: string): Promise<InventoryOpsIncidentRecord | null>;
  findActiveBySource(
    businessId: string,
    sourceType: string,
    sourceId: string,
    incidentType: string
  ): Promise<InventoryOpsIncidentRecord | null>;
  findByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<InventoryOpsIncidentRecord | null>;
  listByBusiness(businessId: string): Promise<InventoryOpsIncidentRecord[]>;
};

export type InventoryOpsIncidentEventRepositoryPort = {
  insertEvent(values: InventoryOpsIncidentEventInsert): Promise<InventoryOpsIncidentEventRecord>;
  listEvents(businessId: string, incidentId: string): Promise<InventoryOpsIncidentEventRecord[]>;
};

export type InventoryOpsIncidentPort = {
  recordFromOperation(
    context: CurrentBusinessContext,
    command: RecordOpsIncidentCommand
  ): Promise<InventoryOpsIncidentRecord | InventoryOpsIncidentView | null>;
};

export type InventoryLocationAccessPort = {
  assertCanOperate(
    context: CurrentBusinessContext,
    locationId: string
  ): Promise<void>;
};

export type InventoryTransferRepositoryPort = {
  insert(values: InventoryTransferInsert): Promise<InventoryTransferRecord>;
  update(
    businessId: string,
    transferId: string,
    patch: InventoryTransferPatch
  ): Promise<InventoryTransferRecord>;
  findById(businessId: string, transferId: string): Promise<InventoryTransferRecord | null>;
  findByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<InventoryTransferRecord | null>;
  listByBusiness(businessId: string): Promise<InventoryTransferRecord[]>;
};

export type InventoryTransferLineRepositoryPort = {
  insert(values: InventoryTransferLineInsert): Promise<InventoryTransferLineRecord>;
  update(
    businessId: string,
    lineId: string,
    patch: InventoryTransferLinePatch
  ): Promise<InventoryTransferLineRecord>;
  listByHeader(businessId: string, transferId: string): Promise<InventoryTransferLineRecord[]>;
  listOpenInTransit(businessId: string): Promise<InventoryTransferLineRecord[]>;
};
