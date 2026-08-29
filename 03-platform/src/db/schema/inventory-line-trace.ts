/**
 * Purpose:
 * Draft traceability captured on an inventory document line before posting.
 *
 * Implementation Package:
 * BP-008 / IP-07 – Batch, Expiry & Serial Resource Tracking
 */

import {
  date,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { stockItem } from "./stock-item";

export const inventoryLineTrace = pgTable(
  "inventory_line_trace",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    sourceType: varchar("source_type", { length: 40 }).notNull(),

    sourceId: uuid("source_id").notNull(),

    sourceLineId: uuid("source_line_id").notNull(),

    stockItemId: uuid("stock_item_id")
      .references(() => stockItem.id)
      .notNull(),

    lotCode: varchar("lot_code", { length: 120 }),

    manufacturedOn: date("manufactured_on"),

    expiresOn: date("expires_on"),

    unitCodes: jsonb("unit_codes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),
  },
  (table) => [
    uniqueIndex("inventory_line_trace_source_line_uidx").on(
      table.businessId,
      table.sourceType,
      table.sourceLineId
    ),
    index("inventory_line_trace_source_idx").on(table.businessId, table.sourceType, table.sourceId),
  ]
);
