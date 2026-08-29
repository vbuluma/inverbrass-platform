/**
 * Purpose:
 * Platform reference catalogue for inventory stock-item types.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const stockItemType = pgTable("stock_item_type", {
  id: uuid("id").defaultRandom().primaryKey(),

  code: varchar("code", { length: 50 }).notNull().unique(),

  name: varchar("name", { length: 100 }).notNull(),

  description: varchar("description", { length: 500 }),

  displayOrder: integer("display_order").default(0).notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
