/**
 * Purpose:
 * Configurable payment-channel catalogue (how the customer initiates).
 * A channel belongs to a provider participation row.
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

import { paymentProvider } from "./payment-provider";

export const paymentChannel = pgTable("payment_channel", {
  id: uuid("id").defaultRandom().primaryKey(),

  paymentProviderId: uuid("payment_provider_id")
    .references(() => paymentProvider.id)
    .notNull(),

  code: varchar("code", { length: 50 }).notNull().unique(),

  name: varchar("name", { length: 100 }).notNull(),

  description: varchar("description", { length: 500 }),

  customerLabel: varchar("customer_label", { length: 100 }),

  displayOrder: integer("display_order").default(0).notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
