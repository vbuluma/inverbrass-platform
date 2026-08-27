/**
 * Purpose:
 * Configurable payment-method catalogue (how the customer pays).
 * Independent of rail, provider, and channel.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const paymentMethod = pgTable("payment_method", {
  id: uuid("id").defaultRandom().primaryKey(),

  code: varchar("code", { length: 30 }).notNull().unique(),

  name: varchar("name", { length: 100 }).notNull(),

  description: varchar("description", { length: 500 }),

  /** Customer-facing label. Configuration data — not a routing key. */
  customerLabel: varchar("customer_label", { length: 100 }),

  iconCode: varchar("icon_code", { length: 100 }),

  displayOrder: integer("display_order").default(0).notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  /**
   * When false, the method can be offered without a rail/provider/channel
   * (for example cash capture). Data-driven — do not switch on method codes.
   */
  requiresRail: boolean("requires_rail").default(true).notNull(),

  requiresProvider: boolean("requires_provider").default(true).notNull(),

  requiresChannel: boolean("requires_channel").default(true).notNull(),

  /**
   * Optional BP-001 coarse enablement flag name (e.g. cashEnabled).
   * Not a payment-method code. creditSalesEnabled must never be stored here.
   */
  enablementFlag: varchar("enablement_flag", { length: 50 }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
