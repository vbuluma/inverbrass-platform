/**
 * Purpose:
 * Stock reservation and sales-deduction documents. Reservations change
 * reserved quantity only. Deductions post SALE_DEDUCTION ledger movements.
 *
 * Implementation Package:
 * BP-008 / IP-03 – Stock Reservation & Sales Deduction
 */

import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { inventoryLocation } from "./inventory-location";
import { inventoryMovement } from "./inventory-movement";
import { stockItem } from "./stock-item";
import { unitOfMeasure } from "./unit-of-measure";

export const inventoryReservation = pgTable(
  "inventory_reservation",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    documentNumber: varchar("document_number", { length: 80 }).notNull(),

    status: varchar("status", { length: 30 }).default("REQUESTED").notNull(),

    stockItemId: uuid("stock_item_id")
      .references(() => stockItem.id)
      .notNull(),

    locationId: uuid("location_id")
      .references(() => inventoryLocation.id)
      .notNull(),

    salesOrderId: varchar("sales_order_id", { length: 80 }),

    salesOrderLineId: varchar("sales_order_line_id", { length: 80 }),

    salesOrderNumber: varchar("sales_order_number", { length: 80 }),

    requestedQuantity: numeric("requested_quantity", { precision: 20, scale: 6 }).notNull(),

    uomId: uuid("uom_id")
      .references(() => unitOfMeasure.id)
      .notNull(),

    baseQuantity: numeric("base_quantity", { precision: 20, scale: 6 }).notNull(),

    conversionFactor: numeric("conversion_factor", { precision: 20, scale: 6 }).notNull(),

    reservedQuantity: numeric("reserved_quantity", { precision: 20, scale: 6 })
      .default("0")
      .notNull(),

    fulfilledQuantity: numeric("fulfilled_quantity", { precision: 20, scale: 6 })
      .default("0")
      .notNull(),

    remainingQuantity: numeric("remaining_quantity", { precision: 20, scale: 6 }).notNull(),

    expiresAt: timestamp("expires_at", { withTimezone: true }),

    idempotencyKey: varchar("idempotency_key", { length: 200 }),

    submittedAt: timestamp("submitted_at", { withTimezone: true }),

    submittedBy: uuid("submitted_by"),

    approvedAt: timestamp("approved_at", { withTimezone: true }),

    approvedBy: uuid("approved_by"),

    rejectedAt: timestamp("rejected_at", { withTimezone: true }),

    rejectedBy: uuid("rejected_by"),

    rejectionReason: varchar("rejection_reason", { length: 1000 }),

    releasedAt: timestamp("released_at", { withTimezone: true }),

    releasedBy: uuid("released_by"),

    notes: varchar("notes", { length: 4000 }),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedBy: uuid("updated_by"),

    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("inventory_reservation_business_number_uidx").on(
      table.businessId,
      table.documentNumber
    ),
    uniqueIndex("inventory_reservation_idempotency_uidx")
      .on(table.businessId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
    uniqueIndex("inventory_reservation_active_sale_line_uidx")
      .on(table.businessId, table.salesOrderLineId)
      .where(
        sql`${table.salesOrderLineId} is not null and ${table.status} in ('REQUESTED','RESERVED','PARTIALLY_FULFILLED')`
      ),
    index("inventory_reservation_business_status_idx").on(table.businessId, table.status),
    index("inventory_reservation_item_location_idx").on(
      table.businessId,
      table.stockItemId,
      table.locationId
    ),
  ]
);

export const inventoryFulfilment = pgTable(
  "inventory_fulfilment",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    reservationId: uuid("reservation_id")
      .references(() => inventoryReservation.id)
      .notNull(),

    fulfilmentReference: varchar("fulfilment_reference", { length: 120 }).notNull(),

    quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),

    baseQuantity: numeric("base_quantity", { precision: 20, scale: 6 }).notNull(),

    uomId: uuid("uom_id")
      .references(() => unitOfMeasure.id)
      .notNull(),

    movementId: uuid("movement_id").references(() => inventoryMovement.id),

    idempotencyKey: varchar("idempotency_key", { length: 200 }).notNull(),

    notes: varchar("notes", { length: 1000 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),
  },
  (table) => [
    uniqueIndex("inventory_fulfilment_idempotency_uidx").on(
      table.businessId,
      table.idempotencyKey
    ),
    uniqueIndex("inventory_fulfilment_reference_uidx").on(
      table.businessId,
      table.reservationId,
      table.fulfilmentReference
    ),
    index("inventory_fulfilment_reservation_idx").on(table.businessId, table.reservationId),
  ]
);
