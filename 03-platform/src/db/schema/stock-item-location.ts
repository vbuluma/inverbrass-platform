/**
 * Purpose:
 * Stock item enabled at one or more inventory locations, with optional
 * location-specific reorder overrides.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { inventoryLocation } from "./inventory-location";
import { stockItem } from "./stock-item";

export const stockItemLocation = pgTable(
  "stock_item_location",
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

    isActive: boolean("is_active").default(true).notNull(),

    reorderLevelOverride: numeric("reorder_level_override", {
      precision: 20,
      scale: 6,
    }),

    minimumStockLevelOverride: numeric("minimum_stock_level_override", {
      precision: 20,
      scale: 6,
    }),

    maximumStockLevelOverride: numeric("maximum_stock_level_override", {
      precision: 20,
      scale: 6,
    }),

    reorderQuantityOverride: numeric("reorder_quantity_override", {
      precision: 20,
      scale: 6,
    }),

    safetyStockOverride: numeric("safety_stock_override", {
      precision: 20,
      scale: 6,
    }),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedBy: uuid("updated_by"),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("stock_item_location_item_loc_uidx")
      .on(table.stockItemId, table.locationId)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
