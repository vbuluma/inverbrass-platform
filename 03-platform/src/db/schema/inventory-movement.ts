/**
 * Purpose:
 * Append-only inventory movement ledger. IP-01 records OPENING_STOCK only.
 * Future movement types are stored as varchar codes — not implemented here.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import {
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
import { stockItem } from "./stock-item";
import { unitOfMeasure } from "./unit-of-measure";

export const inventoryMovement = pgTable(
  "inventory_movement",
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

    movementType: varchar("movement_type", { length: 50 }).notNull(),

    quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),

    uomId: uuid("uom_id")
      .references(() => unitOfMeasure.id)
      .notNull(),

    reason: varchar("reason", { length: 500 }),

    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),
  },
  (table) => [
    uniqueIndex("inventory_movement_opening_uidx")
      .on(table.businessId, table.stockItemId, table.locationId)
      .where(sql`${table.movementType} = 'OPENING_STOCK'`),
    uniqueIndex("inventory_movement_opening_balance_uidx")
      .on(table.businessId, table.stockItemId, table.locationId)
      .where(sql`${table.movementType} = 'OPENING_BALANCE'`),
  ]
);
