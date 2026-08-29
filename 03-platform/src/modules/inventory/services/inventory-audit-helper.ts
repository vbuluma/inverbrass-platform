/**
 * Purpose:
 * Record BP-008 inventory master-data events through ENG-013.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  buildAuditRecordFromContext,
  createAuditService,
  createFieldChanges,
  type AuditService,
} from "@/core/audit";
import type { CurrentBusinessContext } from "@/core/auth/types";
import { INVENTORY_AUDIT_ACTIONS } from "@/modules/inventory/constants";
import type { InventoryAuditPort } from "@/modules/inventory/ports";
import type { InventoryAuditRecord } from "@/modules/inventory/types";

function operationForAction(action: string): string {
  if (
    action === INVENTORY_AUDIT_ACTIONS.STOCK_ITEM_CREATED ||
    action === INVENTORY_AUDIT_ACTIONS.INVENTORY_LOCATION_CREATED ||
    action === INVENTORY_AUDIT_ACTIONS.STOCK_ITEM_LOCATION_CONFIGURED ||
    action === INVENTORY_AUDIT_ACTIONS.OPENING_STOCK_RECORDED ||
    action === INVENTORY_AUDIT_ACTIONS.RECEIPT_CREATED ||
    action === INVENTORY_AUDIT_ACTIONS.RECEIPT_POSTED ||
    action === INVENTORY_AUDIT_ACTIONS.OPENING_BALANCE_CREATED ||
    action === INVENTORY_AUDIT_ACTIONS.OPENING_BALANCE_POSTED ||
    action === INVENTORY_AUDIT_ACTIONS.STOCK_RESERVED ||
    action === INVENTORY_AUDIT_ACTIONS.STOCK_DEDUCTED ||
    action === INVENTORY_AUDIT_ACTIONS.ADJUSTMENT_CREATED ||
    action === INVENTORY_AUDIT_ACTIONS.ADJUSTMENT_POSTED ||
    action === INVENTORY_AUDIT_ACTIONS.DAMAGE_RECORDED ||
    action === INVENTORY_AUDIT_ACTIONS.LOSS_RECORDED ||
    action === INVENTORY_AUDIT_ACTIONS.CUSTOMER_RETURN_POSTED ||
    action === INVENTORY_AUDIT_ACTIONS.SUPPLIER_RETURN_POSTED ||
    action === INVENTORY_AUDIT_ACTIONS.STOCKTAKE_CREATED ||
    action === INVENTORY_AUDIT_ACTIONS.STOCKTAKE_STARTED ||
    action === INVENTORY_AUDIT_ACTIONS.STOCKTAKE_RECONCILIATION_POSTED ||
    action === INVENTORY_AUDIT_ACTIONS.STOCKTAKE_COMPLETED ||
    action === INVENTORY_AUDIT_ACTIONS.LOT_CREATED ||
    action === INVENTORY_AUDIT_ACTIONS.TRACKED_UNIT_CREATED ||
    action === INVENTORY_AUDIT_ACTIONS.TRACKED_UNIT_ASSIGNED ||
    action === INVENTORY_AUDIT_ACTIONS.TRACKED_UNIT_RESERVED ||
    action === INVENTORY_AUDIT_ACTIONS.TRACKED_UNIT_SOLD ||
    action === INVENTORY_AUDIT_ACTIONS.CONTROL_SETTINGS_CREATED ||
    action === INVENTORY_AUDIT_ACTIONS.REPLENISHMENT_ADVICE_CREATED ||
    action === INVENTORY_AUDIT_ACTIONS.REPLENISHMENT_CONDITION_DETECTED ||
    action === INVENTORY_AUDIT_ACTIONS.EXCEPTION_CREATED ||
    action === INVENTORY_AUDIT_ACTIONS.EXCEPTION_OPENED ||
    action === INVENTORY_AUDIT_ACTIONS.TRANSFER_CREATED ||
    action === INVENTORY_AUDIT_ACTIONS.TRANSFER_DISPATCHED ||
    action === INVENTORY_AUDIT_ACTIONS.TRANSFER_RECEIVED
  ) {
    return AUDIT_OPERATIONS.CREATE;
  }
  if (
    action === INVENTORY_AUDIT_ACTIONS.STOCK_ITEM_ACTIVATED ||
    action === INVENTORY_AUDIT_ACTIONS.INVENTORY_LOCATION_ACTIVATED
  ) {
    return AUDIT_OPERATIONS.ACTIVATE;
  }
  if (
    action === INVENTORY_AUDIT_ACTIONS.STOCK_ITEM_DEACTIVATED ||
    action === INVENTORY_AUDIT_ACTIONS.INVENTORY_LOCATION_DEACTIVATED
  ) {
    return AUDIT_OPERATIONS.DEACTIVATE;
  }
  return AUDIT_OPERATIONS.UPDATE;
}

function entityNameForAction(action: string, fallbackEntityName: string): string {
  if (action.startsWith("STOCK_ITEM_LOCATION")) {
    return AUDIT_ENTITY_NAMES.STOCK_ITEM_LOCATION;
  }
  if (action.startsWith("INVENTORY_LOCATION")) {
    return AUDIT_ENTITY_NAMES.INVENTORY_LOCATION;
  }
  if (action.startsWith("RECEIPT_")) {
    return AUDIT_ENTITY_NAMES.INVENTORY_RECEIPT;
  }
  if (action.startsWith("OPENING_BALANCE_")) {
    return AUDIT_ENTITY_NAMES.INVENTORY_OPENING_BALANCE;
  }
  if (action.startsWith("STOCK_RESERVATION") || action.startsWith("STOCK_RESERVED") || action.startsWith("STOCK_DEDUCT")) {
    return AUDIT_ENTITY_NAMES.INVENTORY_RESERVATION;
  }
  if (action.startsWith("ADJUSTMENT_") || action.startsWith("DAMAGE_") || action.startsWith("LOSS_") || action.startsWith("CUSTOMER_RETURN") || action.startsWith("SUPPLIER_RETURN")) {
    return AUDIT_ENTITY_NAMES.INVENTORY_ADJUSTMENT;
  }
  if (action.startsWith("STOCKTAKE_")) {
    return AUDIT_ENTITY_NAMES.INVENTORY_STOCKTAKE;
  }
  if (action.startsWith("LOT_")) {
    return AUDIT_ENTITY_NAMES.INVENTORY_LOT;
  }
  if (action.startsWith("TRACKED_UNIT_")) {
    return AUDIT_ENTITY_NAMES.INVENTORY_TRACKED_UNIT;
  }
  if (action.startsWith("REPLENISHMENT_")) {
    return AUDIT_ENTITY_NAMES.INVENTORY_REPLENISHMENT_ADVICE;
  }
  if (action.startsWith("CONTROL_")) {
    return action.startsWith("CONTROL_CHANGE")
      ? AUDIT_ENTITY_NAMES.INVENTORY_CONTROL_CHANGE
      : AUDIT_ENTITY_NAMES.STOCK_ITEM;
  }
  if (action.startsWith("EXCEPTION_")) {
    return AUDIT_ENTITY_NAMES.INVENTORY_OPS_INCIDENT;
  }
  if (action.startsWith("TRANSFER_")) {
    return AUDIT_ENTITY_NAMES.INVENTORY_TRANSFER;
  }
  if (action === INVENTORY_AUDIT_ACTIONS.TRACKING_MODE_CHANGED) {
    return AUDIT_ENTITY_NAMES.STOCK_ITEM;
  }
  if (action === INVENTORY_AUDIT_ACTIONS.OPENING_STOCK_RECORDED) {
    return AUDIT_ENTITY_NAMES.INVENTORY_MOVEMENT;
  }
  if (action.startsWith("STOCK_ITEM")) {
    return AUDIT_ENTITY_NAMES.STOCK_ITEM;
  }
  return fallbackEntityName;
}

export class InventoryAuditAdapter implements InventoryAuditPort {
  constructor(private readonly auditService: AuditService = createAuditService()) {}

  async record(entry: InventoryAuditRecord): Promise<void> {
    const context: CurrentBusinessContext = {
      businessId: entry.businessId,
      platformUserId: entry.actorUserId ?? "",
      businessMembershipId: "",
    };
    await this.auditService.record(
      buildAuditRecordFromContext(context, {
        entityName: entityNameForAction(entry.action, entry.entityName),
        entityId: entry.entityId,
        operation: operationForAction(entry.action),
        sourceModule: AUDIT_SOURCE_MODULES.INVENTORY,
        changes: createFieldChanges({
          action: entry.action,
          outcome: entry.outcome,
          ...(entry.reason ? { reason: entry.reason } : {}),
          ...(entry.references ?? {}),
        }),
        metadata: {
          action: entry.action,
          outcome: entry.outcome,
          reason: entry.reason ?? null,
          ...(entry.references ?? {}),
        },
      })
    );
  }
}

export function createInventoryAuditAdapter() {
  return new InventoryAuditAdapter();
}

export class RecordingInventoryAudit implements InventoryAuditPort {
  readonly entries: InventoryAuditRecord[] = [];

  async record(entry: InventoryAuditRecord): Promise<void> {
    this.entries.push({
      ...entry,
      timestamp: entry.timestamp ?? new Date().toISOString(),
    });
  }
}
