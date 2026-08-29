/**
 * Purpose:
 * Stock adjustment and return documents. Posted documents create
 * immutable IP-01 ledger movements and never overwrite on-hand.
 *
 * Implementation Package:
 * BP-008 / IP-05 – Stock Adjustments, Damage, Loss & Returns
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

export const inventoryAdjustment = pgTable(
  "inventory_adjustment",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    documentNumber: varchar("document_number", { length: 80 }).notNull(),

    status: varchar("status", { length: 30 }).default("DRAFT").notNull(),

    adjustmentType: varchar("adjustment_type", { length: 40 }).notNull(),

    locationId: uuid("location_id")
      .references(() => inventoryLocation.id)
      .notNull(),

    reason: varchar("reason", { length: 120 }).notNull(),

    notes: varchar("notes", { length: 4000 }),

    externalReference: varchar("external_reference", { length: 120 }),

    originType: varchar("origin_type", { length: 40 }),

    originId: varchar("origin_id", { length: 80 }),

    originLineId: varchar("origin_line_id", { length: 80 }),

    idempotencyKey: varchar("idempotency_key", { length: 200 }),

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
    uniqueIndex("inventory_adjustment_business_number_uidx").on(
      table.businessId,
      table.documentNumber
    ),
    uniqueIndex("inventory_adjustment_idempotency_uidx")
      .on(table.businessId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
    index("inventory_adjustment_business_status_idx").on(table.businessId, table.status),
  ]
);

export const inventoryAdjustmentLine = pgTable(
  "inventory_adjustment_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    adjustmentId: uuid("adjustment_id")
      .references(() => inventoryAdjustment.id)
      .notNull(),

    lineNumber: integer("line_number").notNull(),

    stockItemId: uuid("stock_item_id")
      .references(() => stockItem.id)
      .notNull(),

    quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),

    uomId: uuid("uom_id")
      .references(() => unitOfMeasure.id)
      .notNull(),

    baseQuantity: numeric("base_quantity", { precision: 20, scale: 6 }).notNull(),

    conversionFactor: numeric("conversion_factor", { precision: 20, scale: 6 }).notNull(),

    condition: varchar("condition", { length: 40 }).default("SALEABLE").notNull(),

    onHandBefore: numeric("on_hand_before", { precision: 20, scale: 6 }),

    onHandAfter: numeric("on_hand_after", { precision: 20, scale: 6 }),

    movementId: uuid("movement_id").references(() => inventoryMovement.id),

    notes: varchar("notes", { length: 1000 }),

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
    uniqueIndex("inventory_adjustment_line_number_uidx").on(
      table.adjustmentId,
      table.lineNumber
    ),
    index("inventory_adjustment_line_header_idx").on(table.businessId, table.adjustmentId),
  ]
);
