/**
 * Purpose:
 * Persist opening-balance documents and lines. Distinct from supplier receipts.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import {
  inventoryOpeningBalance,
  inventoryOpeningBalanceLine,
} from "@/db/schema/inventory-opening-balance";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryOpeningBalanceLineRepositoryPort,
  InventoryOpeningBalanceRepositoryPort,
} from "@/modules/inventory/ports";
import type {
  InventoryInboundLineInsert,
  InventoryInboundLinePatch,
  InventoryInboundLineRecord,
  InventoryOpeningBalanceInsert,
  InventoryOpeningBalancePatch,
  InventoryOpeningBalanceRecord,
} from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapHeader(
  row: typeof inventoryOpeningBalance.$inferSelect
): InventoryOpeningBalanceRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    documentNumber: row.documentNumber,
    status: row.status,
    locationId: row.locationId,
    openingDate: row.openingDate,
    notes: row.notes,
    submittedAt: row.submittedAt,
    submittedBy: row.submittedBy,
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    rejectedAt: row.rejectedAt,
    rejectedBy: row.rejectedBy,
    rejectionReason: row.rejectionReason,
    postedAt: row.postedAt,
    postedBy: row.postedBy,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    version: row.version,
  };
}

function mapLine(
  row: typeof inventoryOpeningBalanceLine.$inferSelect
): InventoryInboundLineRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    headerId: row.openingBalanceId,
    lineNumber: row.lineNumber,
    stockItemId: row.stockItemId,
    quantity: String(row.quantity),
    expectedQuantity: null,
    uomId: row.uomId,
    baseQuantity: String(row.baseQuantity),
    conversionFactor: String(row.conversionFactor),
    unitCost: row.unitCost == null ? null : String(row.unitCost),
    lineTotal: row.lineTotal == null ? null : String(row.lineTotal),
    currencyCode: row.currencyCode,
    notes: row.notes,
    movementId: row.movementId,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export class InventoryOpeningBalanceRepository implements InventoryOpeningBalanceRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryOpeningBalanceInsert): Promise<InventoryOpeningBalanceRecord> {
    const [row] = await this.db
      .insert(inventoryOpeningBalance)
      .values({
        id: values.id,
        businessId: values.businessId,
        documentNumber: values.documentNumber,
        status: values.status,
        locationId: values.locationId,
        openingDate: values.openingDate,
        notes: values.notes,
        metadata: values.metadata,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
      })
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapHeader(row);
  }

  async update(businessId: string, openingId: string, patch: InventoryOpeningBalancePatch) {
    const [row] = await this.db
      .update(inventoryOpeningBalance)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryOpeningBalance.businessId, businessId),
          eq(inventoryOpeningBalance.id, openingId)
        )
      )
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
    }
    return mapHeader(row);
  }

  async findById(businessId: string, openingId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryOpeningBalance)
      .where(
        and(
          eq(inventoryOpeningBalance.businessId, businessId),
          eq(inventoryOpeningBalance.id, openingId)
        )
      )
      .limit(1);
    return row ? mapHeader(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(inventoryOpeningBalance)
      .where(eq(inventoryOpeningBalance.businessId, businessId))
      .orderBy(desc(inventoryOpeningBalance.createdAt));
    return rows.map(mapHeader);
  }
}

export class InventoryOpeningBalanceLineRepository
  implements InventoryOpeningBalanceLineRepositoryPort
{
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryInboundLineInsert): Promise<InventoryInboundLineRecord> {
    const [row] = await this.db
      .insert(inventoryOpeningBalanceLine)
      .values({
        id: values.id,
        businessId: values.businessId,
        openingBalanceId: values.headerId,
        lineNumber: values.lineNumber,
        stockItemId: values.stockItemId,
        quantity: values.quantity,
        uomId: values.uomId,
        baseQuantity: values.baseQuantity,
        conversionFactor: values.conversionFactor,
        unitCost: values.unitCost,
        lineTotal: values.lineTotal,
        currencyCode: values.currencyCode,
        notes: values.notes,
        movementId: values.movementId,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
      })
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapLine(row);
  }

  async update(businessId: string, lineId: string, patch: InventoryInboundLinePatch) {
    const [row] = await this.db
      .update(inventoryOpeningBalanceLine)
      .set({
        quantity: patch.quantity,
        uomId: patch.uomId,
        baseQuantity: patch.baseQuantity,
        conversionFactor: patch.conversionFactor,
        unitCost: patch.unitCost,
        lineTotal: patch.lineTotal,
        currencyCode: patch.currencyCode,
        notes: patch.notes,
        movementId: patch.movementId,
        updatedBy: patch.updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryOpeningBalanceLine.businessId, businessId),
          eq(inventoryOpeningBalanceLine.id, lineId)
        )
      )
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
    }
    return mapLine(row);
  }

  async findById(businessId: string, lineId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryOpeningBalanceLine)
      .where(
        and(
          eq(inventoryOpeningBalanceLine.businessId, businessId),
          eq(inventoryOpeningBalanceLine.id, lineId)
        )
      )
      .limit(1);
    return row ? mapLine(row) : null;
  }

  async listByHeader(businessId: string, headerId: string) {
    const rows = await this.db
      .select()
      .from(inventoryOpeningBalanceLine)
      .where(
        and(
          eq(inventoryOpeningBalanceLine.businessId, businessId),
          eq(inventoryOpeningBalanceLine.openingBalanceId, headerId)
        )
      );
    return rows.map(mapLine).sort((a, b) => a.lineNumber - b.lineNumber);
  }
}

export function createInventoryOpeningBalanceRepository() {
  return new InventoryOpeningBalanceRepository();
}

export function createInventoryOpeningBalanceLineRepository() {
  return new InventoryOpeningBalanceLineRepository();
}
