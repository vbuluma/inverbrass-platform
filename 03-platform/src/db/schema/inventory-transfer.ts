/**
 * Purpose:
 * Stock transfer documents. Quantity still posts through the inventory ledger.
 *
 * Implementation Package:
 * BP-008 / IP-04 – Stock Transfers & Multi-Location
 */

import {
  index,
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
import { stockItem } from "./stock-item";
import { unitOfMeasure } from "./unit-of-measure";

export const inventoryTransfer = pgTable(
  "inventory_transfer",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    transferNumber: varchar("transfer_number", { length: 40 }).notNull(),

    status: varchar("status", { length: 30 }).default("DRAFT").notNull(),

    sourceLocationId: uuid("source_location_id")
      .references(() => inventoryLocation.id)
      .notNull(),

    destinationLocationId: uuid("destination_location_id")
      .references(() => inventoryLocation.id)
      .notNull(),

    reason: varchar("reason", { length: 500 }),

    notes: varchar("notes", { length: 1000 }),

    requestedBy: uuid("requested_by"),

    requestedAt: timestamp("requested_at", { withTimezone: true }),

    approvedBy: uuid("approved_by"),

    approvedAt: timestamp("approved_at", { withTimezone: true }),

    rejectedBy: uuid("rejected_by"),

    rejectedAt: timestamp("rejected_at", { withTimezone: true }),

    rejectionReason: varchar("rejection_reason", { length: 1000 }),

    dispatchedBy: uuid("dispatched_by"),

    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),

    receivedBy: uuid("received_by"),

    receivedAt: timestamp("received_at", { withTimezone: true }),

    completedAt: timestamp("completed_at", { withTimezone: true }),

    cancelledBy: uuid("cancelled_by"),

    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    cancellationReason: varchar("cancellation_reason", { length: 1000 }),

    idempotencyKey: varchar("idempotency_key", { length: 160 }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    createdBy: uuid("created_by"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

    updatedBy: uuid("updated_by"),
  },
  (table) => [
    uniqueIndex("inventory_transfer_number_uidx").on(table.businessId, table.transferNumber),
    uniqueIndex("inventory_transfer_idempotency_uidx")
      .on(table.businessId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index("inventory_transfer_business_status_idx").on(table.businessId, table.status),
    index("inventory_transfer_source_idx").on(table.businessId, table.sourceLocationId),
    index("inventory_transfer_destination_idx").on(table.businessId, table.destinationLocationId),
  ]
);

export const inventoryTransferLine = pgTable(
  "inventory_transfer_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    transferId: uuid("transfer_id")
      .references(() => inventoryTransfer.id)
      .notNull(),

    lineNumber: numeric("line_number", { precision: 10, scale: 0 }).notNull(),

    stockItemId: uuid("stock_item_id")
      .references(() => stockItem.id)
      .notNull(),

    quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),

    uomId: uuid("uom_id")
      .references(() => unitOfMeasure.id)
      .notNull(),

    baseQuantity: numeric("base_quantity", { precision: 20, scale: 6 }).notNull(),

    conversionFactor: numeric("conversion_factor", { precision: 20, scale: 6 }),

    receivedQuantity: numeric("received_quantity", { precision: 20, scale: 6 }),

    discrepancyQuantity: numeric("discrepancy_quantity", { precision: 20, scale: 6 }),

    dispatchMovementId: uuid("dispatch_movement_id"),

    receiptMovementId: uuid("receipt_movement_id"),

    notes: varchar("notes", { length: 1000 }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

    updatedBy: uuid("updated_by"),
  },
  (table) => [
    index("inventory_transfer_line_transfer_idx").on(table.businessId, table.transferId),
    index("inventory_transfer_line_item_idx").on(table.businessId, table.stockItemId),
  ]
);
