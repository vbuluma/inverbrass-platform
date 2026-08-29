/**
 * Purpose:
 * Supplier stock receiving header and lines. Posted receipts create
 * IP-01 ledger movements of type RECEIPT — they do not mutate on-hand
 * quantities as a shortcut and do not create supplier bills.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
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

import { business } from "./business";
import { inventoryLocation } from "./inventory-location";
import { inventoryMovement } from "./inventory-movement";
import { party } from "./party";
import { stockItem } from "./stock-item";
import { unitOfMeasure } from "./unit-of-measure";

export const inventoryReceipt = pgTable(
  "inventory_receipt",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    documentNumber: varchar("document_number", { length: 80 }).notNull(),

    status: varchar("status", { length: 30 }).default("DRAFT").notNull(),

    locationId: uuid("location_id")
      .references(() => inventoryLocation.id)
      .notNull(),

    supplierPartyId: uuid("supplier_party_id").references(() => party.id),

    supplierReference: varchar("supplier_reference", { length: 120 }),

    deliveryNumber: varchar("delivery_number", { length: 120 }),

    receiptDate: timestamp("receipt_date", { withTimezone: true })
      .defaultNow()
      .notNull(),

    notes: varchar("notes", { length: 4000 }),

    submittedAt: timestamp("submitted_at", { withTimezone: true }),

    submittedBy: uuid("submitted_by"),

    approvedAt: timestamp("approved_at", { withTimezone: true }),

    approvedBy: uuid("approved_by"),

    rejectedAt: timestamp("rejected_at", { withTimezone: true }),

    rejectedBy: uuid("rejected_by"),

    rejectionReason: varchar("rejection_reason", { length: 1000 }),

    postedAt: timestamp("posted_at", { withTimezone: true }),

    postedBy: uuid("posted_by"),

    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    cancelledBy: uuid("cancelled_by"),

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
    uniqueIndex("inventory_receipt_business_number_uidx").on(
      table.businessId,
      table.documentNumber
    ),
    index("inventory_receipt_business_status_idx").on(table.businessId, table.status),
  ]
);

export const inventoryReceiptLine = pgTable(
  "inventory_receipt_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    receiptId: uuid("receipt_id")
      .references(() => inventoryReceipt.id)
      .notNull(),

    lineNumber: integer("line_number").notNull(),

    stockItemId: uuid("stock_item_id")
      .references(() => stockItem.id)
      .notNull(),

    quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),

    expectedQuantity: numeric("expected_quantity", { precision: 20, scale: 6 }),

    uomId: uuid("uom_id")
      .references(() => unitOfMeasure.id)
      .notNull(),

    baseQuantity: numeric("base_quantity", { precision: 20, scale: 6 }).notNull(),

    conversionFactor: numeric("conversion_factor", { precision: 20, scale: 6 }).notNull(),

    unitCost: numeric("unit_cost", { precision: 20, scale: 6 }),

    lineTotal: numeric("line_total", { precision: 20, scale: 6 }),

    currencyCode: varchar("currency_code", { length: 3 }),

    notes: varchar("notes", { length: 1000 }),

    movementId: uuid("movement_id").references(() => inventoryMovement.id),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedBy: uuid("updated_by"),
  },
  (table) => [
    uniqueIndex("inventory_receipt_line_number_uidx").on(table.receiptId, table.lineNumber),
    index("inventory_receipt_line_receipt_idx").on(table.businessId, table.receiptId),
  ]
);
