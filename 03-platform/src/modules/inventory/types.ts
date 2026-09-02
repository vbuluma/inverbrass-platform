/**
 * Purpose:
 * BP-008 IP-01 view, command, and persistence types.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

export type InventoryProductRef = {
  id: string;
  businessId: string;
  productCode: string;
  productName: string;
  productTypeCode: string;
  isActive: boolean;
  sellingPrice?: string | null;
  taxCode?: string | null;
};

export type InventoryUnitRef = {
  id: string;
  businessId: string;
  code: string;
  name: string;
  symbol: string;
  status: string;
};

export type CatalogueTypeRef = {
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type StockItemRecord = {
  id: string;
  businessId: string;
  productId: string;
  sku: string;
  barcode: string | null;
  stockTrackingEnabled: boolean;
  itemTypeCode: string;
  baseUomId: string;
  purchaseUomId: string | null;
  salesUomId: string | null;
  conversionFactor: string | null;
  reorderLevel: string | null;
  reorderQuantity: string | null;
  minimumStockLevel: string | null;
  maximumStockLevel: string | null;
  safetyStock: string | null;
  leadTimeDays: number | null;
  reviewPeriodDays: number | null;
  isActive: boolean;
  trackingMode: string;
  expiryTrackingEnabled: boolean;
  allowExpiredFulfilment: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  deletedAt: Date | null;
  version: number;
};

export type StockItemInsert = Omit<
  StockItemRecord,
  "id" | "createdAt" | "updatedAt" | "deletedAt" | "version"
> & {
  id?: string;
};

export type StockItemPatch = Partial<
  Pick<
    StockItemRecord,
    | "sku"
    | "barcode"
    | "stockTrackingEnabled"
    | "itemTypeCode"
    | "baseUomId"
    | "purchaseUomId"
    | "salesUomId"
    | "conversionFactor"
    | "reorderLevel"
    | "reorderQuantity"
    | "minimumStockLevel"
    | "maximumStockLevel"
    | "safetyStock"
    | "leadTimeDays"
    | "reviewPeriodDays"
    | "isActive"
    | "trackingMode"
    | "expiryTrackingEnabled"
    | "allowExpiredFulfilment"
    | "updatedBy"
    | "metadata"
  >
>;

export type InventoryLocationRecord = {
  id: string;
  businessId: string;
  code: string;
  name: string;
  description: string | null;
  locationTypeCode: string;
  parentLocationId: string | null;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  deletedAt: Date | null;
  version: number;
};

export type InventoryLocationInsert = Omit<
  InventoryLocationRecord,
  "id" | "createdAt" | "updatedAt" | "deletedAt" | "version"
> & {
  id?: string;
};

export type InventoryLocationPatch = Partial<
  Pick<
    InventoryLocationRecord,
    | "code"
    | "name"
    | "description"
    | "locationTypeCode"
    | "parentLocationId"
    | "isActive"
    | "updatedBy"
    | "metadata"
  >
>;

export type StockItemLocationRecord = {
  id: string;
  businessId: string;
  stockItemId: string;
  locationId: string;
  isActive: boolean;
  reorderLevelOverride: string | null;
  minimumStockLevelOverride: string | null;
  maximumStockLevelOverride: string | null;
  reorderQuantityOverride: string | null;
  safetyStockOverride: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  deletedAt: Date | null;
  version: number;
};

export type StockItemLocationInsert = Omit<
  StockItemLocationRecord,
  "id" | "createdAt" | "updatedAt" | "deletedAt" | "version"
> & {
  id?: string;
};

export type StockItemLocationPatch = Partial<
  Pick<
    StockItemLocationRecord,
    | "isActive"
    | "reorderLevelOverride"
    | "minimumStockLevelOverride"
    | "maximumStockLevelOverride"
    | "reorderQuantityOverride"
    | "safetyStockOverride"
    | "updatedBy"
    | "metadata"
  >
>;

export type InventoryMovementRecord = {
  id: string;
  businessId: string;
  stockItemId: string;
  locationId: string;
  movementType: string;
  quantity: string;
  uomId: string;
  reason: string | null;
  occurredAt: Date;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
};

export type InventoryMovementInsert = Omit<
  InventoryMovementRecord,
  "id" | "createdAt" | "occurredAt"
> & {
  id?: string;
  occurredAt?: Date;
};

export type InventoryBalanceRecord = {
  id: string;
  businessId: string;
  stockItemId: string;
  locationId: string;
  onHand: string;
  reserved: string;
  available: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  version: number;
};

export type InventoryBalanceInsert = Omit<
  InventoryBalanceRecord,
  "id" | "createdAt" | "updatedAt" | "version"
> & {
  id?: string;
};

export type CreateStockItemCommand = {
  productId: string;
  sku: string;
  barcode?: string | null;
  stockTrackingEnabled?: boolean;
  itemTypeCode: string;
  baseUomId: string;
  purchaseUomId?: string | null;
  salesUomId?: string | null;
  conversionFactor?: string | null;
  reorderLevel?: string | null;
  reorderQuantity?: string | null;
  minimumStockLevel?: string | null;
  maximumStockLevel?: string | null;
  safetyStock?: string | null;
  leadTimeDays?: number | null;
  reviewPeriodDays?: number | null;
  trackingMode?: string | null;
  expiryTrackingEnabled?: boolean;
  allowExpiredFulfilment?: boolean;
};

export type UpdateStockItemCommand = {
  sku?: string;
  barcode?: string | null;
  stockTrackingEnabled?: boolean;
  itemTypeCode?: string;
  baseUomId?: string;
  purchaseUomId?: string | null;
  salesUomId?: string | null;
  conversionFactor?: string | null;
  reorderLevel?: string | null;
  reorderQuantity?: string | null;
  minimumStockLevel?: string | null;
  maximumStockLevel?: string | null;
  safetyStock?: string | null;
  leadTimeDays?: number | null;
  reviewPeriodDays?: number | null;
  trackingMode?: string | null;
  expiryTrackingEnabled?: boolean;
  allowExpiredFulfilment?: boolean;
};

export type CreateLocationCommand = {
  code: string;
  name: string;
  description?: string | null;
  locationTypeCode: string;
  parentLocationId?: string | null;
};

export type UpdateLocationCommand = {
  code?: string;
  name?: string;
  description?: string | null;
  locationTypeCode?: string;
  parentLocationId?: string | null;
};

export type ConfigureStockItemLocationCommand = {
  stockItemId: string;
  locationId: string;
  reorderLevelOverride?: string | null;
  minimumStockLevelOverride?: string | null;
  maximumStockLevelOverride?: string | null;
  reorderQuantityOverride?: string | null;
  safetyStockOverride?: string | null;
};

export type UpdateStockItemLocationCommand = {
  isActive?: boolean;
  reorderLevelOverride?: string | null;
  minimumStockLevelOverride?: string | null;
  maximumStockLevelOverride?: string | null;
  reorderQuantityOverride?: string | null;
  safetyStockOverride?: string | null;
};

export type RecordOpeningStockCommand = {
  stockItemId: string;
  locationId: string;
  quantity: string;
  reason?: string | null;
  lotCode?: string | null;
  manufacturedOn?: string | null;
  expiresOn?: string | null;
  unitCodes?: string[] | null;
};

export type StockItemLocationView = {
  id: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  isActive: boolean;
  reorderLevel: string | null;
  minimumStockLevel: string | null;
  maximumStockLevel: string | null;
  onHand: string;
  reserved: string;
  available: string;
};

export type StockItemListView = {
  id: string;
  sku: string;
  productId: string;
  productName: string;
  productCode: string;
  itemTypeCode: string;
  itemTypeLabel: string;
  baseUomCode: string;
  stockTrackingEnabled: boolean;
  trackingMode: string;
  isActive: boolean;
};

export type StockItemDetailView = {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  productTypeCode: string;
  sku: string;
  barcode: string | null;
  stockTrackingEnabled: boolean;
  itemTypeCode: string;
  itemTypeLabel: string;
  baseUomId: string;
  baseUomCode: string;
  purchaseUomId: string | null;
  salesUomId: string | null;
  conversionFactor: string | null;
  reorderLevel: string | null;
  reorderQuantity: string | null;
  minimumStockLevel: string | null;
  maximumStockLevel: string | null;
  safetyStock: string | null;
  leadTimeDays: number | null;
  reviewPeriodDays: number | null;
  trackingMode: string;
  expiryTrackingEnabled: boolean;
  allowExpiredFulfilment: boolean;
  isActive: boolean;
  locations: StockItemLocationView[];
  totalOnHand: string;
  totalReserved: string;
  totalAvailable: string;
};

export type InventoryLocationView = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  locationTypeCode: string;
  locationTypeLabel: string;
  parentLocationId: string | null;
  isActive: boolean;
};

export type InventoryDashboardView = {
  stockItemCount: number;
  locationCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  recentStockItems: StockItemListView[];
  locations: InventoryLocationView[];
  itemTypes: CatalogueTypeRef[];
  locationTypes: CatalogueTypeRef[];
  units: InventoryUnitRef[];
  products: InventoryProductRef[];
};

export type InventoryAuditRecord = {
  businessId: string;
  actorUserId: string | null;
  entityName: string;
  entityId: string;
  action: string;
  outcome: "SUCCESS" | "FAILURE";
  reason?: string | null;
  references?: Record<string, unknown>;
  timestamp?: string;
};

export type InventorySupplierRef = {
  id: string;
  displayName: string;
};

export type InventoryOperationControl = {
  code: string;
  name: string;
  movementType: string;
  requiresApproval: boolean;
  overReceiptPolicy: string;
};

export type InventoryInboundLineRecord = {
  id: string;
  businessId: string;
  headerId: string;
  lineNumber: number;
  stockItemId: string;
  quantity: string;
  expectedQuantity: string | null;
  uomId: string;
  baseQuantity: string;
  conversionFactor: string;
  unitCost: string | null;
  lineTotal: string | null;
  currencyCode: string | null;
  notes: string | null;
  movementId: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type InventoryInboundLineInsert = Omit<
  InventoryInboundLineRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type InventoryInboundLinePatch = Partial<
  Pick<
    InventoryInboundLineRecord,
    | "quantity"
    | "expectedQuantity"
    | "uomId"
    | "baseQuantity"
    | "conversionFactor"
    | "unitCost"
    | "lineTotal"
    | "currencyCode"
    | "notes"
    | "movementId"
    | "updatedBy"
  >
>;

export type InventoryReceiptRecord = {
  id: string;
  businessId: string;
  documentNumber: string;
  status: string;
  locationId: string;
  supplierPartyId: string | null;
  supplierReference: string | null;
  deliveryNumber: string | null;
  receiptDate: Date;
  notes: string | null;
  submittedAt: Date | null;
  submittedBy: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  postedAt: Date | null;
  postedBy: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  version: number;
};

export type InventoryReceiptInsert = Omit<
  InventoryReceiptRecord,
  "id" | "createdAt" | "updatedAt" | "version"
> & {
  id?: string;
};

export type InventoryReceiptPatch = Partial<
  Omit<InventoryReceiptRecord, "id" | "businessId" | "createdAt" | "createdBy">
>;

export type InventoryOpeningBalanceRecord = {
  id: string;
  businessId: string;
  documentNumber: string;
  status: string;
  locationId: string;
  openingDate: Date;
  notes: string | null;
  submittedAt: Date | null;
  submittedBy: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  postedAt: Date | null;
  postedBy: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  version: number;
};

export type InventoryOpeningBalanceInsert = Omit<
  InventoryOpeningBalanceRecord,
  "id" | "createdAt" | "updatedAt" | "version"
> & {
  id?: string;
};

export type InventoryOpeningBalancePatch = Partial<
  Omit<InventoryOpeningBalanceRecord, "id" | "businessId" | "createdAt" | "createdBy">
>;

export type InventoryIdempotencyInsert = {
  businessId: string;
  idempotencyKey: string;
  operationType: string;
  resourceType: string;
  resourceId: string;
  createdBy?: string | null;
};

export type InventoryIdempotencyRecord = InventoryIdempotencyInsert & {
  id: string;
  createdAt: Date;
};

export type CreateReceiptCommand = {
  locationId: string;
  supplierPartyId?: string | null;
  supplierReference?: string | null;
  deliveryNumber?: string | null;
  receiptDate?: string | null;
  notes?: string | null;
};

export type AddReceiptLineCommand = {
  stockItemId: string;
  quantity: string;
  expectedQuantity?: string | null;
  uomId?: string | null;
  unitCost?: string | null;
  lineTotal?: string | null;
  currencyCode?: string | null;
  notes?: string | null;
  lotCode?: string | null;
  manufacturedOn?: string | null;
  expiresOn?: string | null;
  unitCodes?: string[] | null;
};

export type CreateOpeningBalanceCommand = {
  locationId: string;
  openingDate?: string | null;
  notes?: string | null;
};

export type AddOpeningBalanceLineCommand = {
  stockItemId: string;
  quantity: string;
  uomId?: string | null;
  unitCost?: string | null;
  lineTotal?: string | null;
  currencyCode?: string | null;
  notes?: string | null;
  lotCode?: string | null;
  manufacturedOn?: string | null;
  expiresOn?: string | null;
  unitCodes?: string[] | null;
};

export type InventoryInboundLineView = {
  id: string;
  lineNumber: number;
  stockItemId: string;
  sku: string;
  productName: string;
  quantity: string;
  expectedQuantity: string | null;
  receivedQuantity: string | null;
  remainingQuantity: string | null;
  uomCode: string;
  baseQuantity: string;
  baseUomCode: string;
  conversionFactor: string;
  onHand: string;
  unitCost: string | null;
  lineTotal: string | null;
  currencyCode: string | null;
  movementId: string | null;
};

export type InventoryReceiptView = {
  id: string;
  documentNumber: string;
  status: string;
  locationId: string;
  locationName: string;
  supplierPartyId: string | null;
  supplierName: string | null;
  supplierReference: string | null;
  deliveryNumber: string | null;
  receiptDate: string;
  notes: string | null;
  lineCount: number;
  totalQuantity: string;
  totalValue: string | null;
  lines: InventoryInboundLineView[];
  submittedBy: string | null;
  approvedBy: string | null;
  postedAt: string | null;
};

export type InventoryOpeningBalanceView = {
  id: string;
  documentNumber: string;
  status: string;
  locationId: string;
  locationName: string;
  openingDate: string;
  notes: string | null;
  lineCount: number;
  totalQuantity: string;
  totalValue: string | null;
  lines: InventoryInboundLineView[];
  submittedBy: string | null;
  approvedBy: string | null;
  postedAt: string | null;
};

export type InventoryReservationRecord = {
  id: string;
  businessId: string;
  documentNumber: string;
  status: string;
  stockItemId: string;
  locationId: string;
  salesOrderId: string | null;
  salesOrderLineId: string | null;
  salesOrderNumber: string | null;
  requestedQuantity: string;
  uomId: string;
  baseQuantity: string;
  conversionFactor: string;
  reservedQuantity: string;
  fulfilledQuantity: string;
  remainingQuantity: string;
  expiresAt: Date | null;
  idempotencyKey: string | null;
  submittedAt: Date | null;
  submittedBy: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  releasedAt: Date | null;
  releasedBy: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  version: number;
};

export type InventoryReservationInsert = Omit<
  InventoryReservationRecord,
  "id" | "createdAt" | "updatedAt" | "version"
> & {
  id?: string;
};

export type InventoryReservationPatch = Partial<
  Omit<InventoryReservationRecord, "id" | "businessId" | "createdAt" | "createdBy">
>;

export type InventoryFulfilmentRecord = {
  id: string;
  businessId: string;
  reservationId: string;
  fulfilmentReference: string;
  quantity: string;
  baseQuantity: string;
  uomId: string;
  movementId: string | null;
  idempotencyKey: string;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
};

export type InventoryFulfilmentInsert = Omit<InventoryFulfilmentRecord, "id" | "createdAt"> & {
  id?: string;
};

export type CreateReservationCommand = {
  stockItemId: string;
  locationId: string;
  quantity: string;
  uomId?: string | null;
  salesOrderId?: string | null;
  salesOrderLineId?: string | null;
  salesOrderNumber?: string | null;
  idempotencyKey?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
  lotCode?: string | null;
  expiresOn?: string | null;
  unitCodes?: string[] | null;
};

export type FulfilReservationCommand = {
  quantity: string;
  fulfilmentReference: string;
  uomId?: string | null;
  idempotencyKey?: string | null;
  notes?: string | null;
  lotCode?: string | null;
  unitCodes?: string[] | null;
};

export type InventoryReservationView = {
  id: string;
  documentNumber: string;
  status: string;
  stockItemId: string;
  sku: string;
  locationId: string;
  locationName: string;
  salesOrderId: string | null;
  salesOrderLineId: string | null;
  salesOrderNumber: string | null;
  requestedQuantity: string;
  reservedQuantity: string;
  fulfilledQuantity: string;
  remainingQuantity: string;
  uomCode: string;
  baseQuantity: string;
  baseUomCode: string;
  conversionFactor: string;
  onHand: string;
  available: string;
  expiresAt: string | null;
  createdAt: string;
  fulfilments: InventoryFulfilmentView[];
};

export type InventoryFulfilmentView = {
  id: string;
  fulfilmentReference: string;
  quantity: string;
  baseQuantity: string;
  movementId: string | null;
  createdAt: string;
};

export type InventoryAvailabilityView = {
  stockItemId: string;
  sku: string;
  locationId: string;
  locationName: string;
  onHand: string;
  reserved: string;
  available: string;
  inTransit?: string;
  uomCode: string;
  availabilityLabel: string;
};

export type InventorySalesFulfilmentLine = {
  orderLineId: string;
  offeringId: string;
  orderedQuantity: string;
  salesUomId?: string | null;
  outstandingQuantity: string;
  acceptedQuantity: string;
  lineType: string;
  fulfilmentStatus: string;
};

export type InventorySalesFulfilmentContract = {
  orderId: string;
  orderNumber: string;
  businessId: string;
  operationalStatus: string;
  lines: InventorySalesFulfilmentLine[];
};

export type InventoryAdjustmentRecord = {
  id: string;
  businessId: string;
  documentNumber: string;
  status: string;
  adjustmentType: string;
  locationId: string;
  reason: string;
  notes: string | null;
  externalReference: string | null;
  originType: string | null;
  originId: string | null;
  originLineId: string | null;
  idempotencyKey: string | null;
  submittedAt: Date | null;
  submittedBy: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  postedAt: Date | null;
  postedBy: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  version: number;
};

export type InventoryAdjustmentInsert = Omit<
  InventoryAdjustmentRecord,
  "id" | "createdAt" | "updatedAt" | "version"
> & {
  id?: string;
};

export type InventoryAdjustmentPatch = Partial<
  Omit<InventoryAdjustmentRecord, "id" | "businessId" | "createdAt" | "createdBy">
>;

export type InventoryAdjustmentLineRecord = {
  id: string;
  businessId: string;
  headerId: string;
  lineNumber: number;
  stockItemId: string;
  quantity: string;
  uomId: string;
  baseQuantity: string;
  conversionFactor: string;
  condition: string;
  onHandBefore: string | null;
  onHandAfter: string | null;
  movementId: string | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type InventoryAdjustmentLineInsert = Omit<
  InventoryAdjustmentLineRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type InventoryAdjustmentLinePatch = Partial<
  Pick<
    InventoryAdjustmentLineRecord,
    | "quantity"
    | "uomId"
    | "baseQuantity"
    | "conversionFactor"
    | "condition"
    | "onHandBefore"
    | "onHandAfter"
    | "movementId"
    | "notes"
    | "updatedBy"
  >
>;

export type CreateAdjustmentCommand = {
  locationId: string;
  adjustmentType: string;
  reason: string;
  notes?: string | null;
  externalReference?: string | null;
  originType?: string | null;
  originId?: string | null;
  originLineId?: string | null;
  stockItemId: string;
  quantity: string;
  uomId?: string | null;
  condition?: string | null;
  idempotencyKey?: string | null;
  lotCode?: string | null;
  manufacturedOn?: string | null;
  expiresOn?: string | null;
  unitCodes?: string[] | null;
};

export type AddAdjustmentLineCommand = {
  stockItemId: string;
  quantity: string;
  uomId?: string | null;
  condition?: string | null;
  notes?: string | null;
};

export type InventoryAdjustmentLineView = {
  id: string;
  stockItemId: string;
  sku: string;
  quantity: string;
  uomCode: string;
  baseQuantity: string;
  baseUomCode: string;
  conversionFactor: string;
  condition: string;
  onHandBefore: string | null;
  onHandAfter: string | null;
  movementId: string | null;
};

export type InventoryAdjustmentView = {
  id: string;
  documentNumber: string;
  status: string;
  adjustmentType: string;
  adjustmentTypeLabel: string;
  locationId: string;
  locationName: string;
  reason: string;
  notes: string | null;
  externalReference: string | null;
  originType: string | null;
  originId: string | null;
  originLineId: string | null;
  createdAt: string;
  createdBy: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  postedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  rejectionReason: string | null;
  approvalRequired: boolean;
  lineCount: number;
  totalQuantity: string;
  lines: InventoryAdjustmentLineView[];
};

export type InventoryStocktakeRecord = {
  id: string;
  businessId: string;
  documentNumber: string;
  status: string;
  locationId: string;
  scopeType: string;
  scopeGroup: string | null;
  countedOn: Date | null;
  notes: string | null;
  idempotencyKey: string | null;
  startedAt: Date | null;
  startedBy: string | null;
  submittedAt: Date | null;
  submittedBy: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  postedAt: Date | null;
  postedBy: string | null;
  completedAt: Date | null;
  completedBy: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  version: number;
};

export type InventoryStocktakeInsert = Omit<
  InventoryStocktakeRecord,
  "id" | "createdAt" | "updatedAt" | "version"
> & {
  id?: string;
};

export type InventoryStocktakePatch = Partial<
  Omit<InventoryStocktakeRecord, "id" | "businessId" | "createdAt" | "createdBy">
>;

export type InventoryStocktakeLineRecord = {
  id: string;
  businessId: string;
  headerId: string;
  lineNumber: number;
  stockItemId: string;
  locationId: string;
  snapshotQuantity: string;
  snapshotTakenAt: Date;
  countedQuantity: string | null;
  countedUomId: string | null;
  countedBaseQuantity: string | null;
  conversionFactor: string | null;
  varianceQuantity: string | null;
  varianceClass: string | null;
  countStatus: string;
  adjustmentId: string | null;
  movementId: string | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type InventoryStocktakeLineInsert = Omit<
  InventoryStocktakeLineRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type InventoryStocktakeLinePatch = Partial<
  Omit<InventoryStocktakeLineRecord, "id" | "businessId" | "headerId" | "createdAt" | "createdBy">
>;

export type InventoryStocktakeCountRecord = {
  id: string;
  businessId: string;
  lineId: string;
  sequence: number;
  enteredQuantity: string;
  uomId: string;
  baseQuantity: string;
  conversionFactor: string;
  isRecount: boolean;
  countedAt: Date;
  countedBy: string | null;
  createdAt: Date;
};

export type InventoryStocktakeCountInsert = Omit<InventoryStocktakeCountRecord, "id" | "createdAt"> & {
  id?: string;
};

export type CreateStocktakeCommand = {
  locationId: string;
  scopeType: string;
  scopeGroup?: string | null;
  stockItemIds?: string[];
  notes?: string | null;
  countedOn?: string | null;
  idempotencyKey?: string | null;
};

export type RecordStocktakeCountCommand = {
  quantity: string;
  uomId?: string | null;
  notes?: string | null;
  lotCode?: string | null;
  unitCodes?: string[] | null;
};

export type InventoryStocktakeCountView = {
  sequence: number;
  enteredQuantity: string;
  uomCode: string;
  baseQuantity: string;
  isRecount: boolean;
  countedAt: string;
};

export type InventoryStocktakeLineView = {
  id: string;
  stockItemId: string;
  sku: string;
  snapshotQuantity: string;
  countedQuantity: string | null;
  countedBaseQuantity: string | null;
  uomCode: string;
  baseUomCode: string;
  varianceQuantity: string | null;
  varianceClass: string | null;
  countStatus: string;
  adjustmentId: string | null;
  movementId: string | null;
  counts: InventoryStocktakeCountView[];
};

export type InventoryStocktakeView = {
  id: string;
  documentNumber: string;
  status: string;
  locationId: string;
  locationName: string;
  scopeType: string;
  scopeGroup: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  postedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  rejectionReason: string | null;
  approvalRequired: boolean;
  lineCount: number;
  varianceCount: number;
  totalPositiveVariance: string;
  totalNegativeVariance: string;
  lines: InventoryStocktakeLineView[];
};

export type InventoryTraceCapture = {
  lotCode?: string | null;
  manufacturedOn?: string | null;
  expiresOn?: string | null;
  unitCodes?: string[] | null;
};

export type InventoryLotRecord = {
  id: string;
  businessId: string;
  stockItemId: string;
  lotCode: string;
  manufacturedOn: string | null;
  expiresOn: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type InventoryLotInsert = Omit<InventoryLotRecord, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export type InventoryLotPatch = Partial<
  Pick<InventoryLotRecord, "manufacturedOn" | "expiresOn" | "status" | "notes" | "updatedBy">
>;

export type InventoryTrackedUnitRecord = {
  id: string;
  businessId: string;
  stockItemId: string;
  unitCode: string;
  status: string;
  locationId: string | null;
  expiresOn: string | null;
  heldSourceType: string | null;
  heldSourceId: string | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type InventoryTrackedUnitInsert = Omit<
  InventoryTrackedUnitRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type InventoryTrackedUnitPatch = Partial<
  Pick<
    InventoryTrackedUnitRecord,
    | "status"
    | "locationId"
    | "expiresOn"
    | "heldSourceType"
    | "heldSourceId"
    | "notes"
    | "updatedBy"
  >
>;

export type InventoryLineTraceRecord = {
  id: string;
  businessId: string;
  sourceType: string;
  sourceId: string;
  sourceLineId: string;
  stockItemId: string;
  lotCode: string | null;
  manufacturedOn: string | null;
  expiresOn: string | null;
  unitCodes: string[] | null;
  createdAt: Date;
  createdBy: string | null;
};

export type InventoryLineTraceInsert = Omit<InventoryLineTraceRecord, "id" | "createdAt"> & {
  id?: string;
};

export type InventoryTraceAllocationRecord = {
  id: string;
  businessId: string;
  movementId: string;
  stockItemId: string;
  locationId: string;
  lotId: string | null;
  trackedUnitId: string | null;
  direction: string;
  quantity: string;
  sourceType: string;
  sourceId: string;
  sourceLineId: string | null;
  createdAt: Date;
  createdBy: string | null;
};

export type InventoryTraceAllocationInsert = Omit<
  InventoryTraceAllocationRecord,
  "id" | "createdAt"
> & {
  id?: string;
};

export type InventoryLotView = {
  id: string;
  lotCode: string;
  stockItemId: string;
  sku: string;
  locationId: string | null;
  locationName: string | null;
  quantity: string;
  expiresOn: string | null;
  expiryStatus: string;
  status: string;
};

export type InventoryTrackedUnitView = {
  id: string;
  unitCode: string;
  stockItemId: string;
  sku: string;
  locationId: string | null;
  locationName: string | null;
  status: string;
  expiresOn: string | null;
  expiryStatus: string;
  lastMovementId: string | null;
};

export type InventoryTraceEventView = {
  occurredAt: string;
  movementType: string;
  direction: string;
  quantity: string;
  locationName: string;
  sourceType: string;
  sourceId: string;
};

export type InventoryTraceabilitySearchQuery = {
  stockItemId?: string | null;
  lotCode?: string | null;
  unitCode?: string | null;
  locationId?: string | null;
  expiryStatus?: string | null;
};

export type InventoryControlSettings = {
  minimumStock: string | null;
  reorderLevel: string | null;
  maximumStock: string | null;
  reorderQuantity: string | null;
  safetyStock: string | null;
  leadTimeDays: number | null;
  reviewPeriodDays: number | null;
};

export type SaveInventoryControlSettingsCommand = {
  stockItemId: string;
  locationId?: string | null;
  minimumStock?: string | null;
  reorderLevel?: string | null;
  maximumStock?: string | null;
  reorderQuantity?: string | null;
  safetyStock?: string | null;
  leadTimeDays?: number | null;
  reviewPeriodDays?: number | null;
  idempotencyKey?: string | null;
};

export type InventoryControlPositionView = {
  stockItemId: string;
  sku: string;
  productName: string;
  locationId: string;
  locationName: string;
  trackingMode: string;
  onHand: string;
  reserved: string;
  available: string;
  saleableAvailable: string;
  expiredQuantity: string;
  minimumStock: string | null;
  reorderLevel: string | null;
  maximumStock: string | null;
  reorderQuantity: string | null;
  safetyStock: string | null;
  recommendedQuantity: string;
  status: string;
  configurationMissing: boolean;
  openAdviceId: string | null;
};

export type InventoryControlDashboardView = {
  totalItems: number;
  healthy: number;
  lowStock: number;
  reorderRequired: number;
  outOfStock: number;
  overstock: number;
  configurationMissing: number;
  rows: InventoryControlPositionView[];
  pendingChanges: InventoryControlChangeRecord[];
  openAdvice: InventoryReplenishmentAdviceRecord[];
};

export type InventoryReplenishmentAdviceRecord = {
  id: string;
  businessId: string;
  stockItemId: string;
  locationId: string;
  adviceNumber: string;
  conditionCode: string;
  status: string;
  onHand: string;
  reserved: string;
  available: string;
  saleableAvailable: string;
  thresholdQuantity: string | null;
  recommendedQuantity: string;
  reason: string | null;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  closedAt: Date | null;
  closedBy: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type InventoryReplenishmentAdviceInsert = Omit<
  InventoryReplenishmentAdviceRecord,
  "id" | "createdAt" | "updatedAt" | "acknowledgedAt" | "closedAt"
> & {
  id?: string;
  acknowledgedAt?: Date | null;
  closedAt?: Date | null;
};

export type InventoryReplenishmentAdvicePatch = Partial<
  Pick<
    InventoryReplenishmentAdviceRecord,
    | "status"
    | "onHand"
    | "reserved"
    | "available"
    | "saleableAvailable"
    | "thresholdQuantity"
    | "recommendedQuantity"
    | "reason"
    | "acknowledgedAt"
    | "acknowledgedBy"
    | "closedAt"
    | "closedBy"
    | "updatedBy"
  >
>;

export type InventoryControlChangeRecord = {
  id: string;
  businessId: string;
  stockItemId: string;
  locationId: string | null;
  status: string;
  previousSettings: InventoryControlSettings | null;
  proposedSettings: InventoryControlSettings;
  submittedBy: string | null;
  submittedAt: Date | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewReason: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type InventoryControlChangeInsert = Omit<
  InventoryControlChangeRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type InventoryControlChangePatch = Partial<
  Pick<
    InventoryControlChangeRecord,
    | "status"
    | "submittedBy"
    | "submittedAt"
    | "reviewedBy"
    | "reviewedAt"
    | "reviewReason"
    | "updatedBy"
  >
>;

export type InventoryOpsIncidentTypeRef = {
  code: string;
  name: string;
  description: string | null;
  defaultSeverity: string;
  isActive: boolean;
};

export type InventoryOpsIncidentRecord = {
  id: string;
  businessId: string;
  incidentNumber: string;
  incidentType: string;
  severity: string;
  status: string;
  sourceType: string;
  sourceId: string;
  stockItemId: string | null;
  locationId: string | null;
  description: string;
  detectedAt: Date;
  investigationStartedAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  resolutionAction: string | null;
  resolutionReason: string | null;
  resolutionNotes: string | null;
  linkedAdjustmentId: string | null;
  makerId: string | null;
  checkerId: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type InventoryOpsIncidentInsert = Omit<
  InventoryOpsIncidentRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type InventoryOpsIncidentPatch = Partial<
  Omit<InventoryOpsIncidentRecord, "id" | "businessId" | "createdAt" | "createdBy">
>;

export type InventoryOpsIncidentEventRecord = {
  id: string;
  businessId: string;
  incidentId: string;
  eventType: string;
  note: string | null;
  actorId: string | null;
  createdAt: Date;
};

export type InventoryOpsIncidentEventInsert = Omit<InventoryOpsIncidentEventRecord, "id" | "createdAt"> & {
  id?: string;
};

export type RecordOpsIncidentCommand = {
  incidentType: string;
  severity?: string | null;
  sourceType: string;
  sourceId: string;
  stockItemId?: string | null;
  locationId?: string | null;
  description: string;
  idempotencyKey?: string | null;
};

export type ResolveOpsIncidentCommand = {
  incidentId: string;
  resolutionAction: string;
  reason: string;
  notes?: string | null;
  adjustment?: CreateAdjustmentCommand | null;
};

export type InventoryOpsIncidentView = InventoryOpsIncidentRecord & {
  incidentTypeLabel: string;
  sku: string | null;
  locationName: string | null;
  events: InventoryOpsIncidentEventRecord[];
};

export type InventoryTransferRecord = {
  id: string;
  businessId: string;
  transferNumber: string;
  status: string;
  sourceLocationId: string;
  destinationLocationId: string;
  reason: string | null;
  notes: string | null;
  requestedBy: string | null;
  requestedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  dispatchedBy: string | null;
  dispatchedAt: Date | null;
  receivedBy: string | null;
  receivedAt: Date | null;
  completedAt: Date | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type InventoryTransferInsert = Omit<
  InventoryTransferRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type InventoryTransferPatch = Partial<
  Omit<InventoryTransferRecord, "id" | "businessId" | "createdAt" | "createdBy">
>;

export type InventoryTransferLineRecord = {
  id: string;
  businessId: string;
  transferId: string;
  lineNumber: number;
  stockItemId: string;
  quantity: string;
  uomId: string;
  baseQuantity: string;
  conversionFactor: string | null;
  receivedQuantity: string | null;
  discrepancyQuantity: string | null;
  dispatchMovementId: string | null;
  receiptMovementId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
};

export type InventoryTransferLineInsert = Omit<
  InventoryTransferLineRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type InventoryTransferLinePatch = Partial<
  Omit<InventoryTransferLineRecord, "id" | "businessId" | "transferId" | "createdAt">
>;

export type CreateTransferCommand = {
  sourceLocationId: string;
  destinationLocationId: string;
  reason?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
  lines: Array<{
    stockItemId: string;
    quantity: string;
    uomId?: string | null;
    notes?: string | null;
    lotCode?: string | null;
    unitCodes?: string[] | null;
    manufacturedOn?: string | null;
    expiresOn?: string | null;
  }>;
};

export type ReceiveTransferCommand = {
  transferId: string;
  notes?: string | null;
  lines: Array<{
    lineId: string;
    receivedQuantity: string;
    lotCode?: string | null;
    unitCodes?: string[] | null;
    manufacturedOn?: string | null;
    expiresOn?: string | null;
  }>;
};

export type InventoryTransferLineView = InventoryTransferLineRecord & {
  sku: string;
  productName: string | null;
  baseUomCode: string | null;
};

export type InventoryTransferView = InventoryTransferRecord & {
  sourceLocationName: string;
  destinationLocationName: string;
  approvalRequired: boolean;
  totalQuantity: string;
  totalReceived: string;
  totalDiscrepancy: string;
  inTransitQuantity: string;
  lineCount: number;
  lines: InventoryTransferLineView[];
};

export type InventoryTransferSummary = {
  openTransferCount: number;
  inTransitQuantity: string;
};


