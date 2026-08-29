/**
 * Purpose:
 * Links an immutable ledger movement to a lot or tracked unit.
 * Does not store an independent on-hand balance.
 *
 * Implementation Package:
 * BP-008 / IP-07 – Batch, Expiry & Serial Resource Tracking
 */

import {
  index,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { inventoryLocation } from "./inventory-location";
import { inventoryLot } from "./inventory-lot";
import { inventoryMovement } from "./inventory-movement";
import { inventoryTrackedUnit } from "./inventory-tracked-unit";
import { stockItem } from "./stock-item";

export const inventoryTraceAllocation = pgTable(
  "inventory_trace_allocation",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    movementId: uuid("movement_id")
      .references(() => inventoryMovement.id)
      .notNull(),

    stockItemId: uuid("stock_item_id")
      .references(() => stockItem.id)
      .notNull(),

    locationId: uuid("location_id")
      .references(() => inventoryLocation.id)
      .notNull(),

    lotId: uuid("lot_id").references(() => inventoryLot.id),

    trackedUnitId: uuid("tracked_unit_id").references(() => inventoryTrackedUnit.id),

    direction: varchar("direction", { length: 10 }).notNull(),

    quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),

    sourceType: varchar("source_type", { length: 40 }).notNull(),

    sourceId: uuid("source_id").notNull(),

    sourceLineId: uuid("source_line_id"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),
  },
  (table) => [
    index("inventory_trace_allocation_movement_idx").on(table.businessId, table.movementId),
    index("inventory_trace_allocation_lot_idx").on(table.businessId, table.lotId),
    index("inventory_trace_allocation_unit_idx").on(table.businessId, table.trackedUnitId),
  ]
);
