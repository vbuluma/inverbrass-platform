/**
 * Purpose:
 * Foundational on-hand / reserved / available quantity per stock item
 * and location. Balances are derived from movements — not edited directly.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import {
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { inventoryLocation } from "./inventory-location";
import { stockItem } from "./stock-item";

export const inventoryBalance = pgTable(
  "inventory_balance",
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

    onHand: numeric("on_hand", { precision: 20, scale: 6 })
      .default("0")
      .notNull(),

    reserved: numeric("reserved", { precision: 20, scale: 6 })
      .default("0")
      .notNull(),

    available: numeric("available", { precision: 20, scale: 6 })
      .default("0")
      .notNull(),

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
    uniqueIndex("inventory_balance_item_location_uidx").on(
      table.businessId,
      table.stockItemId,
      table.locationId
    ),
  ]
);
