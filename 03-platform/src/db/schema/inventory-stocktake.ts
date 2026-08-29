/**
 * Purpose:
 * Physical stocktake documents, lines, and count history.
 * Reconciliation posts through IP-05 adjustments, not a second ledger.
 *
 * Implementation Package:
 * BP-008 / IP-06 – Stocktake & Inventory Reconciliation
 */

import {
  boolean,
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
import { inventoryAdjustment } from "./inventory-adjustment";
import { inventoryLocation } from "./inventory-location";
import { inventoryMovement } from "./inventory-movement";
import { stockItem } from "./stock-item";
import { unitOfMeasure } from "./unit-of-measure";

export const inventoryStocktake = pgTable(
  "inventory_stocktake",
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

    scopeType: varchar("scope_type", { length: 40 }).notNull(),

    scopeGroup: varchar("scope_group", { length: 80 }),

    countedOn: timestamp("counted_on", { withTimezone: true }),

    notes: varchar("notes", { length: 4000 }),

    idempotencyKey: varchar("idempotency_key", { length: 200 }),

    startedAt: timestamp("started_at", { withTimezone: true }),

    startedBy: uuid("started_by"),

    submittedAt: timestamp("submitted_at", { withTimezone: true }),

    submittedBy: uuid("submitted_by"),

    approvedAt: timestamp("approved_at", { withTimezone: true }),

    approvedBy: uuid("approved_by"),

    rejectedAt: timestamp("rejected_at", { withTimezone: true }),

    rejectedBy: uuid("rejected_by"),

    rejectionReason: varchar("rejection_reason", { length: 1000 }),

    postedAt: timestamp("posted_at", { withTimezone: true }),

    postedBy: uuid("posted_by"),

    completedAt: timestamp("completed_at", { withTimezone: true }),

    completedBy: uuid("completed_by"),

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
    uniqueIndex("inventory_stocktake_business_number_uidx").on(
      table.businessId,
      table.documentNumber
    ),
    uniqueIndex("inventory_stocktake_idempotency_uidx")
      .on(table.businessId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
    index("inventory_stocktake_business_status_idx").on(table.businessId, table.status),
  ]
);

export const inventoryStocktakeLine = pgTable(
  "inventory_stocktake_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    stocktakeId: uuid("stocktake_id")
      .references(() => inventoryStocktake.id)
      .notNull(),

    lineNumber: integer("line_number").notNull(),

    stockItemId: uuid("stock_item_id")
      .references(() => stockItem.id)
      .notNull(),

    locationId: uuid("location_id")
      .references(() => inventoryLocation.id)
      .notNull(),

    snapshotQuantity: numeric("snapshot_quantity", { precision: 20, scale: 6 }).notNull(),

    snapshotTakenAt: timestamp("snapshot_taken_at", { withTimezone: true }).notNull(),

    countedQuantity: numeric("counted_quantity", { precision: 20, scale: 6 }),

    countedUomId: uuid("counted_uom_id").references(() => unitOfMeasure.id),

    countedBaseQuantity: numeric("counted_base_quantity", { precision: 20, scale: 6 }),

    conversionFactor: numeric("conversion_factor", { precision: 20, scale: 6 }),

    varianceQuantity: numeric("variance_quantity", { precision: 20, scale: 6 }),

    varianceClass: varchar("variance_class", { length: 20 }),

    countStatus: varchar("count_status", { length: 30 }).default("PENDING").notNull(),

    adjustmentId: uuid("adjustment_id").references(() => inventoryAdjustment.id),

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
    uniqueIndex("inventory_stocktake_line_number_uidx").on(table.stocktakeId, table.lineNumber),
    uniqueIndex("inventory_stocktake_line_item_uidx").on(table.stocktakeId, table.stockItemId),
    index("inventory_stocktake_line_header_idx").on(table.businessId, table.stocktakeId),
  ]
);

export const inventoryStocktakeCount = pgTable(
  "inventory_stocktake_count",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    lineId: uuid("line_id")
      .references(() => inventoryStocktakeLine.id)
      .notNull(),

    sequence: integer("sequence").notNull(),

    enteredQuantity: numeric("entered_quantity", { precision: 20, scale: 6 }).notNull(),

    uomId: uuid("uom_id")
      .references(() => unitOfMeasure.id)
      .notNull(),

    baseQuantity: numeric("base_quantity", { precision: 20, scale: 6 }).notNull(),

    conversionFactor: numeric("conversion_factor", { precision: 20, scale: 6 }).notNull(),

    isRecount: boolean("is_recount").default(false).notNull(),

    countedAt: timestamp("counted_at", { withTimezone: true }).defaultNow().notNull(),

    countedBy: uuid("counted_by"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("inventory_stocktake_count_sequence_uidx").on(table.lineId, table.sequence),
    index("inventory_stocktake_count_line_idx").on(table.businessId, table.lineId),
  ]
);
