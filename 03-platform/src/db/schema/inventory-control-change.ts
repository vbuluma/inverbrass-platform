/**
 * Purpose:
 * Pending inventory-control setting changes when maker-checker is on.
 *
 * Implementation Package:
 * BP-008 / IP-08 – Reorder & Inventory Controls
 */

import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { inventoryLocation } from "./inventory-location";
import { stockItem } from "./stock-item";

export const inventoryControlChange = pgTable(
  "inventory_control_change",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    stockItemId: uuid("stock_item_id")
      .references(() => stockItem.id)
      .notNull(),

    locationId: uuid("location_id").references(() => inventoryLocation.id),

    status: varchar("status", { length: 30 }).default("DRAFT").notNull(),

    previousSettings: jsonb("previous_settings"),

    proposedSettings: jsonb("proposed_settings").notNull(),

    submittedBy: uuid("submitted_by"),

    submittedAt: timestamp("submitted_at", { withTimezone: true }),

    reviewedBy: uuid("reviewed_by"),

    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),

    reviewReason: varchar("review_reason", { length: 1000 }),

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
    index("inventory_control_change_business_item_idx").on(
      table.businessId,
      table.stockItemId,
      table.status
    ),
  ]
);
