/**
 * Purpose:
 * Typed, fail-closed errors for BP-008 inventory foundation operations.
 * Messages use operational language — no Build Pack or engine jargon.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

export const INVENTORY_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  SESSION_REQUIRED: "SESSION_REQUIRED",
  BUSINESS_CONTEXT_REQUIRED: "BUSINESS_CONTEXT_REQUIRED",
  CROSS_BUSINESS_ACCESS: "CROSS_BUSINESS_ACCESS",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  PRODUCT_REQUIRED: "PRODUCT_REQUIRED",
  DUPLICATE_STOCK_ITEM: "DUPLICATE_STOCK_ITEM",
  DUPLICATE_SKU: "DUPLICATE_SKU",
  SERVICE_CANNOT_CREATE_STOCK: "SERVICE_CANNOT_CREATE_STOCK",
  NON_STOCK_CANNOT_CREATE_BALANCE: "NON_STOCK_CANNOT_CREATE_BALANCE",
  STOCK_TRACKING_REQUIRED: "STOCK_TRACKING_REQUIRED",
  BASE_UOM_REQUIRED: "BASE_UOM_REQUIRED",
  INVALID_UOM: "INVALID_UOM",
  STOCK_ITEM_NOT_FOUND: "STOCK_ITEM_NOT_FOUND",
  LOCATION_NOT_FOUND: "LOCATION_NOT_FOUND",
  LOCATION_INACTIVE: "LOCATION_INACTIVE",
  DUPLICATE_LOCATION_CODE: "DUPLICATE_LOCATION_CODE",
  INVALID_LOCATION_TYPE: "INVALID_LOCATION_TYPE",
  INVALID_ITEM_TYPE: "INVALID_ITEM_TYPE",
  INVALID_PARENT_LOCATION: "INVALID_PARENT_LOCATION",
  STOCK_ITEM_LOCATION_NOT_FOUND: "STOCK_ITEM_LOCATION_NOT_FOUND",
  STOCK_ITEM_NOT_AT_LOCATION: "STOCK_ITEM_NOT_AT_LOCATION",
  OPENING_STOCK_ALREADY_RECORDED: "OPENING_STOCK_ALREADY_RECORDED",
  OPENING_QUANTITY_INVALID: "OPENING_QUANTITY_INVALID",
  MOVEMENT_NOT_ALLOWED: "MOVEMENT_NOT_ALLOWED",
  DOCUMENT_NOT_FOUND: "DOCUMENT_NOT_FOUND",
  DOCUMENT_NOT_EDITABLE: "DOCUMENT_NOT_EDITABLE",
  DOCUMENT_NOT_POSTABLE: "DOCUMENT_NOT_POSTABLE",
  DOCUMENT_ALREADY_POSTED: "DOCUMENT_ALREADY_POSTED",
  DOCUMENT_NOT_CANCELLABLE: "DOCUMENT_NOT_CANCELLABLE",
  LINE_REQUIRED: "LINE_REQUIRED",
  INVALID_QUANTITY: "INVALID_QUANTITY",
  INVALID_COST: "INVALID_COST",
  OVER_RECEIPT_NOT_ALLOWED: "OVER_RECEIPT_NOT_ALLOWED",
  SUPPLIER_NOT_FOUND: "SUPPLIER_NOT_FOUND",
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
  SELF_APPROVAL: "SELF_APPROVAL",
  OPERATION_CONTROL_MISSING: "OPERATION_CONTROL_MISSING",
  CONCURRENT_UPDATE: "CONCURRENT_UPDATE",
  CONVERSION_REQUIRED: "CONVERSION_REQUIRED",
  INVALID_CONVERSION_FACTOR: "INVALID_CONVERSION_FACTOR",
  INSUFFICIENT_AVAILABLE_STOCK: "INSUFFICIENT_AVAILABLE_STOCK",
  DEDUCTION_EXCEEDS_RESERVATION: "DEDUCTION_EXCEEDS_RESERVATION",
  NEGATIVE_STOCK_NOT_ALLOWED: "NEGATIVE_STOCK_NOT_ALLOWED",
  RESERVATION_NOT_FOUND: "RESERVATION_NOT_FOUND",
  RESERVATION_NOT_RELEASABLE: "RESERVATION_NOT_RELEASABLE",
  RESERVATION_NOT_FULFILLABLE: "RESERVATION_NOT_FULFILLABLE",
  DUPLICATE_RESERVATION: "DUPLICATE_RESERVATION",
  SALE_NOT_FULFILLABLE: "SALE_NOT_FULFILLABLE",
  SALE_LINE_NOT_FOUND: "SALE_LINE_NOT_FOUND",
  INSUFFICIENT_STOCK_FOR_ADJUSTMENT: "INSUFFICIENT_STOCK_FOR_ADJUSTMENT",
  RETURN_QUANTITY_EXCEEDS_RETURNABLE: "RETURN_QUANTITY_EXCEEDS_RETURNABLE",
  ADJUSTMENT_REASON_REQUIRED: "ADJUSTMENT_REASON_REQUIRED",
  STOCKTAKE_COUNT_REQUIRED: "STOCKTAKE_COUNT_REQUIRED",
  STOCKTAKE_BASIS_CHANGED: "STOCKTAKE_BASIS_CHANGED",
  STOCKTAKE_NOT_COUNTABLE: "STOCKTAKE_NOT_COUNTABLE",
  STOCKTAKE_LINE_NOT_FOUND: "STOCKTAKE_LINE_NOT_FOUND",
  TRACKING_REQUIRED: "TRACKING_REQUIRED",
  TRACKING_NOT_ALLOWED: "TRACKING_NOT_ALLOWED",
  TRACKING_MODE_LOCKED: "TRACKING_MODE_LOCKED",
  INVALID_TRACKING_MODE: "INVALID_TRACKING_MODE",
  LOT_REQUIRED: "LOT_REQUIRED",
  LOT_NOT_FOUND: "LOT_NOT_FOUND",
  DUPLICATE_LOT: "DUPLICATE_LOT",
  UNIT_CODES_REQUIRED: "UNIT_CODES_REQUIRED",
  UNIT_COUNT_MISMATCH: "UNIT_COUNT_MISMATCH",
  DUPLICATE_TRACKED_UNIT: "DUPLICATE_TRACKED_UNIT",
  TRACKED_UNIT_NOT_FOUND: "TRACKED_UNIT_NOT_FOUND",
  TRACKED_UNIT_NOT_AVAILABLE: "TRACKED_UNIT_NOT_AVAILABLE",
  TRACKED_UNIT_CONFLICT: "TRACKED_UNIT_CONFLICT",
  EXPIRED_STOCK_NOT_ALLOWED: "EXPIRED_STOCK_NOT_ALLOWED",
  EXPIRY_REQUIRED: "EXPIRY_REQUIRED",
  INSUFFICIENT_LOT_QUANTITY: "INSUFFICIENT_LOT_QUANTITY",
  INVALID_CONTROL_CONFIGURATION: "INVALID_CONTROL_CONFIGURATION",
  CONTROL_CHANGE_NOT_FOUND: "CONTROL_CHANGE_NOT_FOUND",
  CONTROL_CHANGE_NOT_REVIEWABLE: "CONTROL_CHANGE_NOT_REVIEWABLE",
  ADVICE_NOT_FOUND: "ADVICE_NOT_FOUND",
  ADVICE_NOT_ACTIONABLE: "ADVICE_NOT_ACTIONABLE",
  INVALID_INCIDENT_TYPE: "INVALID_INCIDENT_TYPE",
  INCIDENT_NOT_FOUND: "INCIDENT_NOT_FOUND",
  INCIDENT_NOT_ACTIONABLE: "INCIDENT_NOT_ACTIONABLE",
  INVALID_INCIDENT_TRANSITION: "INVALID_INCIDENT_TRANSITION",
  TRANSFER_PROCESSING_UNAVAILABLE: "TRANSFER_PROCESSING_UNAVAILABLE",
  SAME_LOCATION_TRANSFER: "SAME_LOCATION_TRANSFER",
  TRANSFER_NOT_FOUND: "TRANSFER_NOT_FOUND",
  TRANSFER_NOT_ACTIONABLE: "TRANSFER_NOT_ACTIONABLE",
  TRANSFER_NOT_CANCELLABLE: "TRANSFER_NOT_CANCELLABLE",
  TRANSFER_ALREADY_DISPATCHED: "TRANSFER_ALREADY_DISPATCHED",
  TRANSFER_OVER_RECEIPT: "TRANSFER_OVER_RECEIPT",
  LOCATION_ACCESS_DENIED: "LOCATION_ACCESS_DENIED",
  PROVIDER_ERROR: "PROVIDER_ERROR",
} as const;

export type InventoryErrorCode =
  (typeof INVENTORY_ERROR_CODES)[keyof typeof INVENTORY_ERROR_CODES];

export const INVENTORY_USER_MESSAGES: Record<InventoryErrorCode, string> = {
  INVALID_INPUT: "Please check the highlighted fields and try again.",
  SESSION_REQUIRED: "Your session has expired. Please sign in again.",
  BUSINESS_CONTEXT_REQUIRED: "Select a business before continuing.",
  CROSS_BUSINESS_ACCESS:
    "This inventory record belongs to another business and cannot be opened here.",
  PRODUCT_NOT_FOUND: "This product could not be found for the current business.",
  PRODUCT_REQUIRED: "Select a product from the catalogue before creating a stock item.",
  DUPLICATE_STOCK_ITEM:
    "This product already has an active stock item. Open the existing item instead.",
  DUPLICATE_SKU: "This SKU is already used by another stock item in this business.",
  SERVICE_CANNOT_CREATE_STOCK:
    "Services cannot be set up as stocked items or given a stock balance.",
  NON_STOCK_CANNOT_CREATE_BALANCE:
    "Non-stock items cannot be given an opening stock balance.",
  STOCK_TRACKING_REQUIRED:
    "Stock tracking must be enabled before opening stock can be recorded.",
  BASE_UOM_REQUIRED: "Select a valid unit of measure before recording stock.",
  INVALID_UOM: "The selected unit of measure is not valid for this business.",
  STOCK_ITEM_NOT_FOUND: "This stock item could not be found for the current business.",
  LOCATION_NOT_FOUND: "This location could not be found for the current business.",
  LOCATION_INACTIVE: "This location is inactive and cannot receive stock.",
  DUPLICATE_LOCATION_CODE: "This location code is already used in this business.",
  INVALID_LOCATION_TYPE: "Select a valid location type.",
  INVALID_ITEM_TYPE: "Select a valid stock item type.",
  INVALID_PARENT_LOCATION: "The parent location is not valid for this business.",
  STOCK_ITEM_LOCATION_NOT_FOUND:
    "This stock item is not configured at that location.",
  STOCK_ITEM_NOT_AT_LOCATION:
    "Enable this stock item at the location before recording opening stock.",
  OPENING_STOCK_ALREADY_RECORDED:
    "Opening stock has already been recorded for this item at this location. Corrections must use a stock adjustment later.",
  OPENING_QUANTITY_INVALID: "Enter an opening quantity greater than zero.",
  MOVEMENT_NOT_ALLOWED: "This stock movement cannot be recorded for the selected item.",
  DOCUMENT_NOT_FOUND: "This inventory document could not be found for the current business.",
  DOCUMENT_NOT_EDITABLE: "Posted or submitted documents cannot be edited. Create a new document if a correction is needed.",
  DOCUMENT_NOT_POSTABLE: "This document cannot be posted in its current status.",
  DOCUMENT_ALREADY_POSTED: "This document has already been posted.",
  DOCUMENT_NOT_CANCELLABLE: "Posted documents cannot be cancelled. Use a later controlled correction if stock must change.",
  LINE_REQUIRED: "Add at least one product line before submitting or posting.",
  INVALID_QUANTITY: "Enter a quantity greater than zero.",
  INVALID_COST: "Quantity times unit cost must equal the line total.",
  OVER_RECEIPT_NOT_ALLOWED: "Received quantity cannot exceed the expected quantity for this delivery.",
  SUPPLIER_NOT_FOUND: "The selected supplier could not be found for the current business.",
  APPROVAL_REQUIRED: "This document must be approved before it can be posted.",
  SELF_APPROVAL: "The person who submitted this document cannot approve it.",
  OPERATION_CONTROL_MISSING: "Inventory posting controls are not configured for this business.",
  CONCURRENT_UPDATE: "This stock record was updated by someone else. Refresh and try again.",
  CONVERSION_REQUIRED:
    "A conversion factor is required before this unit can be received into stock.",
  INVALID_CONVERSION_FACTOR:
    "The unit conversion factor for this stock item is missing or invalid.",
  INSUFFICIENT_AVAILABLE_STOCK:
    "There is not enough available stock at this location for the requested quantity.",
  DEDUCTION_EXCEEDS_RESERVATION:
    "Stock cannot be deducted beyond the remaining reserved quantity.",
  NEGATIVE_STOCK_NOT_ALLOWED:
    "This deduction would take on-hand stock below zero.",
  RESERVATION_NOT_FOUND:
    "This reservation could not be found for the current business.",
  RESERVATION_NOT_RELEASABLE:
    "This reservation cannot be released in its current status.",
  RESERVATION_NOT_FULFILLABLE:
    "This reservation cannot be fulfilled in its current status.",
  DUPLICATE_RESERVATION:
    "An active reservation already exists for this sale line.",
  SALE_NOT_FULFILLABLE:
    "This sale is not confirmed for stock reservation or deduction.",
  SALE_LINE_NOT_FOUND:
    "The selected sale line could not be found on the confirmed sale.",
  INSUFFICIENT_STOCK_FOR_ADJUSTMENT:
    "There is not enough available stock at this location for this adjustment.",
  RETURN_QUANTITY_EXCEEDS_RETURNABLE:
    "The return quantity is greater than the quantity still returnable for this origin.",
  ADJUSTMENT_REASON_REQUIRED:
    "Enter a reason for this adjustment. Other reasons need an explanatory note.",
  STOCKTAKE_COUNT_REQUIRED:
    "Enter a physical count for every item before submitting this stocktake.",
  STOCKTAKE_BASIS_CHANGED:
    "Stock has changed since this count was taken. Review the current quantity before posting.",
  STOCKTAKE_NOT_COUNTABLE:
    "Counts can only be entered while this stocktake is in progress.",
  STOCKTAKE_LINE_NOT_FOUND:
    "This stocktake line could not be found for the current business.",
  TRACKING_REQUIRED:
    "This item requires batch or serial details before stock can be posted.",
  TRACKING_NOT_ALLOWED:
    "Batch or serial details cannot be recorded for an item that is quantity-only.",
  TRACKING_MODE_LOCKED:
    "Tracking cannot be changed because this item already has stock history.",
  INVALID_TRACKING_MODE: "Select a valid tracking mode.",
  LOT_REQUIRED: "Enter the batch for this stock movement.",
  LOT_NOT_FOUND: "This batch could not be found for the current business.",
  DUPLICATE_LOT: "This batch already exists for the selected item.",
  UNIT_CODES_REQUIRED: "Enter one serial for each unit received or deducted.",
  UNIT_COUNT_MISMATCH:
    "The number of serials must match the quantity in the base unit.",
  DUPLICATE_TRACKED_UNIT: "This serial is already recorded for this business.",
  TRACKED_UNIT_NOT_FOUND: "This serial could not be found for the current business.",
  TRACKED_UNIT_NOT_AVAILABLE: "This serial is not available for this operation.",
  TRACKED_UNIT_CONFLICT: "This serial is already reserved or in use.",
  EXPIRED_STOCK_NOT_ALLOWED:
    "Expired stock cannot be reserved or sold for this item.",
  EXPIRY_REQUIRED: "Enter an expiry date for this batch.",
  INSUFFICIENT_LOT_QUANTITY:
    "There is not enough quantity on this batch at the selected location.",
  INVALID_CONTROL_CONFIGURATION:
    "Check the stock control levels. Minimum cannot exceed maximum, and values cannot be negative.",
  CONTROL_CHANGE_NOT_FOUND:
    "This control change could not be found for the current business.",
  CONTROL_CHANGE_NOT_REVIEWABLE:
    "This control change cannot be approved or rejected in its current status.",
  ADVICE_NOT_FOUND:
    "This replenishment recommendation could not be found for the current business.",
  ADVICE_NOT_ACTIONABLE:
    "This recommendation cannot be updated in its current status.",
  INVALID_INCIDENT_TYPE: "Select a valid exception type.",
  INCIDENT_NOT_FOUND: "This exception could not be found for the current business.",
  INCIDENT_NOT_ACTIONABLE: "This exception cannot be updated in its current status.",
  INVALID_INCIDENT_TRANSITION: "That status change is not allowed for this exception.",
  TRANSFER_PROCESSING_UNAVAILABLE:
    "Transfer processing is not available. This exception type can be recorded only.",
  SAME_LOCATION_TRANSFER: "Source and destination locations must be different.",
  TRANSFER_NOT_FOUND: "This transfer could not be found for the current business.",
  TRANSFER_NOT_ACTIONABLE: "This transfer cannot be updated in its current status.",
  TRANSFER_NOT_CANCELLABLE:
    "A dispatched transfer cannot be cancelled. Source stock is not restored automatically.",
  TRANSFER_ALREADY_DISPATCHED: "This transfer has already been dispatched.",
  TRANSFER_OVER_RECEIPT: "Received quantity cannot exceed the dispatched quantity.",
  LOCATION_ACCESS_DENIED: "You cannot operate on that location.",
  PROVIDER_ERROR: "The inventory details could not be saved. Please try again.",
};

export class InventoryError extends Error {
  readonly code: InventoryErrorCode;
  readonly statusCode: number;
  readonly field?: string;

  constructor(
    code: InventoryErrorCode,
    message: string = INVENTORY_USER_MESSAGES[code],
    statusCode = 400,
    options?: { field?: string }
  ) {
    super(message);
    this.name = "InventoryError";
    this.code = code;
    this.statusCode = statusCode;
    this.field = options?.field;
  }
}
