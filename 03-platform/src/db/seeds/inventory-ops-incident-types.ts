/**
 * Purpose:
 * Platform catalogue of operational inventory incident types.
 *
 * Implementation Package:
 * BP-008 / IP-09 – Inventory Operations, Exceptions & Controls
 */

export const inventoryOpsIncidentTypes = [
  {
    code: "RECEIVING_MISMATCH",
    name: "Receiving mismatch",
    description: "Received quantity or details do not match the expected delivery.",
    defaultSeverity: "HIGH",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "STOCK_NEGATIVE_ATTEMPT",
    name: "Negative stock attempt",
    description: "An operation tried to take on-hand or available stock below zero.",
    defaultSeverity: "CRITICAL",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "RESERVATION_CONFLICT",
    name: "Reservation conflict",
    description: "Stock could not be reserved because of availability or serial conflict.",
    defaultSeverity: "HIGH",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "STOCKTAKE_VARIANCE",
    name: "Stocktake variance",
    description: "A counted quantity differs from the system quantity.",
    defaultSeverity: "MEDIUM",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "ADJUSTMENT_REVIEW",
    name: "Adjustment review",
    description: "A stock adjustment needs operational review before it is accepted.",
    defaultSeverity: "MEDIUM",
    displayOrder: 50,
    isActive: true,
  },
  {
    code: "TRANSFER_EXCEPTION",
    name: "Transfer issue",
    description: "Reserved for multi-location transfer issues. Transfer processing is not available here.",
    defaultSeverity: "MEDIUM",
    displayOrder: 60,
    isActive: true,
  },
  {
    code: "BATCH_EXPIRY_EXCEPTION",
    name: "Batch or expiry issue",
    description: "Batch or expiry details are missing, expired, or inconsistent.",
    defaultSeverity: "HIGH",
    displayOrder: 70,
    isActive: true,
  },
  {
    code: "SERIAL_EXCEPTION",
    name: "Serial issue",
    description: "A serial is missing, duplicated, or not available for the operation.",
    defaultSeverity: "HIGH",
    displayOrder: 80,
    isActive: true,
  },
  {
    code: "DUPLICATE_OPERATION",
    name: "Duplicate operation",
    description: "The same inventory operation was submitted more than once.",
    defaultSeverity: "LOW",
    displayOrder: 90,
    isActive: true,
  },
  {
    code: "INVENTORY_DATA_INCONSISTENCY",
    name: "Data inconsistency",
    description: "Inventory records do not agree and need investigation.",
    defaultSeverity: "HIGH",
    displayOrder: 100,
    isActive: true,
  },
  {
    code: "CONTROL_CONFIGURATION_EXCEPTION",
    name: "Control configuration issue",
    description: "Inventory control levels are missing or invalid.",
    defaultSeverity: "MEDIUM",
    displayOrder: 110,
    isActive: true,
  },
] as const;
