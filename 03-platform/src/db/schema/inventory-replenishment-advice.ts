/**
 * Purpose:
 * Replenishment advice raised when inventory controls are breached.
 * Quantity fields are snapshots; the ledger remains authoritative.
 *
 * Implementation Package:
 * BP-008 / IP-08 – Reorder & Inventory Controls
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

export const inventoryReplenishmentAdvice = pgTable(
  "inventory_replenishment_advice",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    stockItemId: uuid("stock_item_id")
      .references(() => stockItem.id)
      .notNull(),

    locationId: uuid("location_id")
      .references(() => inventoryLocation.id)
      .notNull(),

    adviceNumber: varchar("advice_number", { length: 40 }).notNull(),

    conditionCode: varchar("condition_code", { length: 40 }).notNull(),

    status: varchar("status", { length: 30 }).default("OPEN").notNull(),

    onHand: numeric("on_hand", { precision: 20, scale: 6 }).notNull(),

    reserved: numeric("reserved", { precision: 20, scale: 6 }).notNull(),

    available: numeric("available", { precision: 20, scale: 6 }).notNull(),

    saleableAvailable: numeric("saleable_available", {
      precision: 20,
      scale: 6,
    }).notNull(),

    thresholdQuantity: numeric("threshold_quantity", {
      precision: 20,
      scale: 6,
    }),

    recommendedQuantity: numeric("recommended_quantity", {
      precision: 20,
      scale: 6,
    }).notNull(),

    reason: varchar("reason", { length: 1000 }),

    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),

    acknowledgedBy: uuid("acknowledged_by"),

    closedAt: timestamp("closed_at", { withTimezone: true }),

    closedBy: uuid("closed_by"),

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
    uniqueIndex("inventory_replenishment_advice_number_uidx").on(
      table.businessId,
      table.adviceNumber
    ),
    uniqueIndex("inventory_replenishment_advice_open_uidx")
      .on(table.businessId, table.stockItemId, table.locationId, table.conditionCode)
      .where(sql`${table.status} IN ('OPEN', 'ACKNOWLEDGED')`),
    index("inventory_replenishment_advice_business_status_idx").on(
      table.businessId,
      table.status
    ),
  ]
);
