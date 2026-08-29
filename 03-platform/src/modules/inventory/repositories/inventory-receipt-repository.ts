/**
 * Purpose:
 * Persist stock receiving headers and lines.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { inventoryReceipt, inventoryReceiptLine } from "@/db/schema/inventory-receipt";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryReceiptLineRepositoryPort,
  InventoryReceiptRepositoryPort,
} from "@/modules/inventory/ports";
import type {
  InventoryInboundLineInsert,
  InventoryInboundLinePatch,
  InventoryInboundLineRecord,
  InventoryReceiptInsert,
  InventoryReceiptPatch,
  InventoryReceiptRecord,
} from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapHeader(row: typeof inventoryReceipt.$inferSelect): InventoryReceiptRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    documentNumber: row.documentNumber,
    status: row.status,
    locationId: row.locationId,
    supplierPartyId: row.supplierPartyId,
    supplierReference: row.supplierReference,
    deliveryNumber: row.deliveryNumber,
    receiptDate: row.receiptDate,
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

function mapLine(row: typeof inventoryReceiptLine.$inferSelect): InventoryInboundLineRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    headerId: row.receiptId,
    lineNumber: row.lineNumber,
    stockItemId: row.stockItemId,
    quantity: String(row.quantity),
    expectedQuantity: row.expectedQuantity == null ? null : String(row.expectedQuantity),
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

export class InventoryReceiptRepository implements InventoryReceiptRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryReceiptInsert): Promise<InventoryReceiptRecord> {
    const [row] = await this.db
      .insert(inventoryReceipt)
      .values({
        id: values.id,
        businessId: values.businessId,
        documentNumber: values.documentNumber,
        status: values.status,
        locationId: values.locationId,
        supplierPartyId: values.supplierPartyId,
        supplierReference: values.supplierReference,
        deliveryNumber: values.deliveryNumber,
        receiptDate: values.receiptDate,
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

  async update(businessId: string, receiptId: string, patch: InventoryReceiptPatch) {
    const [row] = await this.db
      .update(inventoryReceipt)
      .set({
        ...patch,
        updatedAt: new Date(),
        version: (patch.version ?? undefined) as number | undefined,
      })
      .where(and(eq(inventoryReceipt.businessId, businessId), eq(inventoryReceipt.id, receiptId)))
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
    }
    return mapHeader(row);
  }

  async findById(businessId: string, receiptId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryReceipt)
      .where(and(eq(inventoryReceipt.businessId, businessId), eq(inventoryReceipt.id, receiptId)))
      .limit(1);
    return row ? mapHeader(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(inventoryReceipt)
      .where(eq(inventoryReceipt.businessId, businessId))
      .orderBy(desc(inventoryReceipt.createdAt));
    return rows.map(mapHeader);
  }
}

export class InventoryReceiptLineRepository implements InventoryReceiptLineRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryInboundLineInsert): Promise<InventoryInboundLineRecord> {
    const [row] = await this.db
      .insert(inventoryReceiptLine)
      .values({
        id: values.id,
        businessId: values.businessId,
        receiptId: values.headerId,
        lineNumber: values.lineNumber,
        stockItemId: values.stockItemId,
        quantity: values.quantity,
        expectedQuantity: values.expectedQuantity,
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
      .update(inventoryReceiptLine)
      .set({
        quantity: patch.quantity,
        expectedQuantity: patch.expectedQuantity,
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
        and(eq(inventoryReceiptLine.businessId, businessId), eq(inventoryReceiptLine.id, lineId))
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
      .from(inventoryReceiptLine)
      .where(
        and(eq(inventoryReceiptLine.businessId, businessId), eq(inventoryReceiptLine.id, lineId))
      )
      .limit(1);
    return row ? mapLine(row) : null;
  }

  async listByHeader(businessId: string, headerId: string) {
    const rows = await this.db
      .select()
      .from(inventoryReceiptLine)
      .where(
        and(
          eq(inventoryReceiptLine.businessId, businessId),
          eq(inventoryReceiptLine.receiptId, headerId)
        )
      );
    return rows.map(mapLine).sort((a, b) => a.lineNumber - b.lineNumber);
  }
}

export function createInventoryReceiptRepository() {
  return new InventoryReceiptRepository();
}

export function createInventoryReceiptLineRepository() {
  return new InventoryReceiptLineRepository();
}
