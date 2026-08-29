/**
 * Purpose:
 * Individual tracked unit identity for SERIAL-tracked stock.
 * One unit is one physical piece. Quantity is not stored independently.
 *
 * Implementation Package:
 * BP-008 / IP-07 – Batch, Expiry & Serial Resource Tracking
 */

import {
  date,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { inventoryLocation } from "./inventory-location";
import { stockItem } from "./stock-item";

export const inventoryTrackedUnit = pgTable(
  "inventory_tracked_unit",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    stockItemId: uuid("stock_item_id")
      .references(() => stockItem.id)
      .notNull(),

    unitCode: varchar("unit_code", { length: 120 }).notNull(),

    status: varchar("status", { length: 30 }).default("AVAILABLE").notNull(),

    locationId: uuid("location_id").references(() => inventoryLocation.id),

    expiresOn: date("expires_on"),

    heldSourceType: varchar("held_source_type", { length: 40 }),

    heldSourceId: uuid("held_source_id"),

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
    uniqueIndex("inventory_tracked_unit_business_code_uidx").on(
      table.businessId,
      table.unitCode
    ),
    index("inventory_tracked_unit_business_item_idx").on(table.businessId, table.stockItemId),
    index("inventory_tracked_unit_location_idx").on(table.businessId, table.locationId),
  ]
);
