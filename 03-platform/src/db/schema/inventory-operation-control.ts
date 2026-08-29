/**
 * Purpose:
 * Platform catalogue of inventory operation controls (approval and
 * over-receipt policy). Looked up by operation code — not hard-coded
 * per receiving/opening branch in application services.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const inventoryOperationControl = pgTable("inventory_operation_control", {
  id: uuid("id").defaultRandom().primaryKey(),

  code: varchar("code", { length: 80 }).notNull().unique(),

  name: varchar("name", { length: 120 }).notNull(),

  description: varchar("description", { length: 500 }),

  movementType: varchar("movement_type", { length: 50 }).notNull(),

  requiresApproval: boolean("requires_approval").default(false).notNull(),

  overReceiptPolicy: varchar("over_receipt_policy", { length: 40 })
    .default("BLOCK")
    .notNull(),

  displayOrder: integer("display_order").default(0).notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
