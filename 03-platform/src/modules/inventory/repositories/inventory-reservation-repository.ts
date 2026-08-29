/**
 * Purpose:
 * Persist inventory reservations and fulfilment/deduction records.
 *
 * Implementation Package:
 * BP-008 / IP-03 – Stock Reservation & Sales Deduction
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import {
  inventoryFulfilment,
  inventoryReservation,
} from "@/db/schema/inventory-reservation";
import { INVENTORY_RESERVATION_STATUSES } from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryFulfilmentRepositoryPort,
  InventoryReservationRepositoryPort,
} from "@/modules/inventory/ports";
import type {
  InventoryFulfilmentInsert,
  InventoryFulfilmentRecord,
  InventoryReservationInsert,
  InventoryReservationPatch,
  InventoryReservationRecord,
} from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapReservation(
  row: typeof inventoryReservation.$inferSelect
): InventoryReservationRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    documentNumber: row.documentNumber,
    status: row.status,
    stockItemId: row.stockItemId,
    locationId: row.locationId,
    salesOrderId: row.salesOrderId,
    salesOrderLineId: row.salesOrderLineId,
    salesOrderNumber: row.salesOrderNumber,
    requestedQuantity: String(row.requestedQuantity),
    uomId: row.uomId,
    baseQuantity: String(row.baseQuantity),
    conversionFactor: String(row.conversionFactor),
    reservedQuantity: String(row.reservedQuantity),
    fulfilledQuantity: String(row.fulfilledQuantity),
    remainingQuantity: String(row.remainingQuantity),
    expiresAt: row.expiresAt,
    idempotencyKey: row.idempotencyKey,
    submittedAt: row.submittedAt,
    submittedBy: row.submittedBy,
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    rejectedAt: row.rejectedAt,
    rejectedBy: row.rejectedBy,
    rejectionReason: row.rejectionReason,
    releasedAt: row.releasedAt,
    releasedBy: row.releasedBy,
    notes: row.notes,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    version: row.version,
  };
}

function mapFulfilment(
  row: typeof inventoryFulfilment.$inferSelect
): InventoryFulfilmentRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    reservationId: row.reservationId,
    fulfilmentReference: row.fulfilmentReference,
    quantity: String(row.quantity),
    baseQuantity: String(row.baseQuantity),
    uomId: row.uomId,
    movementId: row.movementId,
    idempotencyKey: row.idempotencyKey,
    notes: row.notes,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

export class InventoryReservationRepository implements InventoryReservationRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryReservationInsert): Promise<InventoryReservationRecord> {
    const [row] = await this.db
      .insert(inventoryReservation)
      .values({
        id: values.id,
        businessId: values.businessId,
        documentNumber: values.documentNumber,
        status: values.status,
        stockItemId: values.stockItemId,
        locationId: values.locationId,
        salesOrderId: values.salesOrderId,
        salesOrderLineId: values.salesOrderLineId,
        salesOrderNumber: values.salesOrderNumber,
        requestedQuantity: values.requestedQuantity,
        uomId: values.uomId,
        baseQuantity: values.baseQuantity,
        conversionFactor: values.conversionFactor,
        reservedQuantity: values.reservedQuantity,
        fulfilledQuantity: values.fulfilledQuantity,
        remainingQuantity: values.remainingQuantity,
        expiresAt: values.expiresAt,
        idempotencyKey: values.idempotencyKey,
        submittedAt: values.submittedAt,
        submittedBy: values.submittedBy,
        notes: values.notes,
        metadata: values.metadata,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
      })
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapReservation(row);
  }

  async update(businessId: string, reservationId: string, patch: InventoryReservationPatch) {
    const [row] = await this.db
      .update(inventoryReservation)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryReservation.businessId, businessId),
          eq(inventoryReservation.id, reservationId)
        )
      )
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.RESERVATION_NOT_FOUND, undefined, 404);
    }
    return mapReservation(row);
  }

  async findById(businessId: string, reservationId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryReservation)
      .where(
        and(
          eq(inventoryReservation.businessId, businessId),
          eq(inventoryReservation.id, reservationId)
        )
      )
      .limit(1);
    return row ? mapReservation(row) : null;
  }

  async findByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(inventoryReservation)
      .where(
        and(
          eq(inventoryReservation.businessId, businessId),
          eq(inventoryReservation.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapReservation(row) : null;
  }

  async findActiveBySaleLine(businessId: string, salesOrderLineId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryReservation)
      .where(
        and(
          eq(inventoryReservation.businessId, businessId),
          eq(inventoryReservation.salesOrderLineId, salesOrderLineId),
          inArray(inventoryReservation.status, [
            INVENTORY_RESERVATION_STATUSES.REQUESTED,
            INVENTORY_RESERVATION_STATUSES.RESERVED,
            INVENTORY_RESERVATION_STATUSES.PARTIALLY_FULFILLED,
          ])
        )
      )
      .limit(1);
    return row ? mapReservation(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(inventoryReservation)
      .where(eq(inventoryReservation.businessId, businessId))
      .orderBy(desc(inventoryReservation.createdAt));
    return rows.map(mapReservation);
  }

  async listActiveByItemLocation(businessId: string, stockItemId: string, locationId: string) {
    const rows = await this.db
      .select()
      .from(inventoryReservation)
      .where(
        and(
          eq(inventoryReservation.businessId, businessId),
          eq(inventoryReservation.stockItemId, stockItemId),
          eq(inventoryReservation.locationId, locationId),
          inArray(inventoryReservation.status, [
            INVENTORY_RESERVATION_STATUSES.RESERVED,
            INVENTORY_RESERVATION_STATUSES.PARTIALLY_FULFILLED,
          ])
        )
      );
    return rows.map(mapReservation);
  }
}

export class InventoryFulfilmentRepository implements InventoryFulfilmentRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryFulfilmentInsert): Promise<InventoryFulfilmentRecord> {
    const [row] = await this.db
      .insert(inventoryFulfilment)
      .values({
        id: values.id,
        businessId: values.businessId,
        reservationId: values.reservationId,
        fulfilmentReference: values.fulfilmentReference,
        quantity: values.quantity,
        baseQuantity: values.baseQuantity,
        uomId: values.uomId,
        movementId: values.movementId,
        idempotencyKey: values.idempotencyKey,
        notes: values.notes,
        createdBy: values.createdBy,
      })
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapFulfilment(row);
  }

  async findByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(inventoryFulfilment)
      .where(
        and(
          eq(inventoryFulfilment.businessId, businessId),
          eq(inventoryFulfilment.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapFulfilment(row) : null;
  }

  async listByReservation(businessId: string, reservationId: string) {
    const rows = await this.db
      .select()
      .from(inventoryFulfilment)
      .where(
        and(
          eq(inventoryFulfilment.businessId, businessId),
          eq(inventoryFulfilment.reservationId, reservationId)
        )
      );
    return rows.map(mapFulfilment);
  }
}

export function createInventoryReservationRepository() {
  return new InventoryReservationRepository();
}

export function createInventoryFulfilmentRepository() {
  return new InventoryFulfilmentRepository();
}
