/**
 * Purpose:
 * Configurable payment rail/network catalogue.
 * A rail belongs to a method; it is not a provider identity.
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

import { paymentMethod } from "./payment-method";

export const paymentNetwork = pgTable("payment_network", {
  id: uuid("id").defaultRandom().primaryKey(),

  paymentMethodId: uuid("payment_method_id")
    .references(() => paymentMethod.id)
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
