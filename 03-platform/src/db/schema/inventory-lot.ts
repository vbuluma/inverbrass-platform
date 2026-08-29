/**
 * Purpose:
 * Lot identity for BATCH-tracked stock. Quantity is derived from
 * ledger allocations, not stored here.
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
import { stockItem } from "./stock-item";

export const inventoryLot = pgTable(
  "inventory_lot",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    stockItemId: uuid("stock_item_id")
      .references(() => stockItem.id)
      .notNull(),

    lotCode: varchar("lot_code", { length: 120 }).notNull(),

    manufacturedOn: date("manufactured_on"),

    expiresOn: date("expires_on"),

    status: varchar("status", { length: 30 }).default("ACTIVE").notNull(),

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
    uniqueIndex("inventory_lot_business_item_code_uidx").on(
      table.businessId,
      table.stockItemId,
      table.lotCode
    ),
    index("inventory_lot_business_item_idx").on(table.businessId, table.stockItemId),
  ]
);
