/**
 * Purpose:
 * Public exports for BP-008 Inventory foundation (IP-01).
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

export {
  INVENTORY_AUDIT_ACTIONS,
  INVENTORY_BUILD_PACK,
  INVENTORY_DOCUMENT_STATUSES,
  INVENTORY_IP,
  INVENTORY_LOCATION_TYPE_CODES,
  INVENTORY_LOCATION_TYPE_LABELS,
  INVENTORY_OPERATION_CODES,
  INVENTORY_RESERVATION_STATUSES,
  INVENTORY_ADJUSTMENT_TYPES,
  INVENTORY_ADJUSTMENT_TYPE_LABELS,
  INVENTORY_STOCKTAKE_LINE_STATUSES,
  INVENTORY_STOCKTAKE_SCOPE_TYPES,
  INVENTORY_STOCKTAKE_STATUSES,
  INVENTORY_TRACKING_MODES,
  INVENTORY_CONTROL_STATUSES,
  INVENTORY_CONTROL_STATUS_LABELS,
  INVENTORY_ADVICE_STATUSES,
  INVENTORY_VARIANCE_CLASSES,
  INVENTORY_OPS_INCIDENT_STATUSES,
  INVENTORY_OPS_INCIDENT_STATUS_LABELS,
  INVENTORY_OPS_INCIDENT_TYPES,
  INVENTORY_OPS_INCIDENT_TYPE_LABELS,
  INVENTORY_OPS_SEVERITIES,
  INVENTORY_OPS_SEVERITY_LABELS,
  INVENTORY_OPS_RESOLUTION_ACTIONS,
  INVENTORY_TRANSFER_STATUSES,
  INVENTORY_TRANSFER_STATUS_LABELS,
  PRODUCT_TYPES_THAT_CANNOT_CREATE_STOCK,
  STOCK_ITEM_TYPE_CODES,
  STOCK_ITEM_TYPE_LABELS,
} from "@/modules/inventory/constants";

export {
  InventoryError,
  INVENTORY_ERROR_CODES,
  INVENTORY_USER_MESSAGES,
} from "@/modules/inventory/errors";

export type {
  InventoryDashboardView,
  InventoryLocationView,
  StockItemDetailView,
  StockItemListView,
} from "@/modules/inventory/types";

export {
  InventoryFoundationService,
  createDefaultInventoryFoundationDependencies,
  createInventoryFoundationService,
} from "@/modules/inventory/services/inventory-foundation-service";

export {
  StockReceivingService,
  createDefaultStockReceivingDependencies,
  createStockReceivingService,
} from "@/modules/inventory/services/stock-receiving-service";

export {
  StockReservationService,
  createDefaultStockReservationDependencies,
  createStockReservationService,
} from "@/modules/inventory/services/stock-reservation-service";

export {
  StockAdjustmentService,
  createDefaultStockAdjustmentDependencies,
  createStockAdjustmentService,
} from "@/modules/inventory/services/stock-adjustment-service";

export {
  StocktakeService,
  createDefaultStocktakeDependencies,
  createStocktakeService,
} from "@/modules/inventory/services/stocktake-service";

export {
  TraceabilityService,
  createTraceabilityService,
} from "@/modules/inventory/services/inventory-traceability-service";

export {
  InventoryControlService,
  createDefaultInventoryControlDependencies,
  createInventoryControlService,
} from "@/modules/inventory/services/inventory-control-service";

export {
  InventoryOpsIncidentService,
  createDefaultInventoryOpsIncidentDependencies,
  createInventoryOpsIncidentService,
} from "@/modules/inventory/services/inventory-ops-incident-service";

export {
  StockTransferService,
  createDefaultStockTransferDependencies,
  createStockTransferService,
} from "@/modules/inventory/services/stock-transfer-service";
