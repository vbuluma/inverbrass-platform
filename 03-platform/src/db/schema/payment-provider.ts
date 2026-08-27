/**
 * Purpose:
 * Configurable payment-provider catalogue.
 * One row per provider/network participation (existing locked convention).
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

import { paymentNetwork } from "./payment-network";

export const paymentProvider = pgTable("payment_provider", {
  id: uuid("id").defaultRandom().primaryKey(),

  paymentNetworkId: uuid("payment_network_id")
    .references(() => paymentNetwork.id)
    .notNull(),

  code: varchar("code", { length: 50 }).notNull().unique(),

  name: varchar("name", { length: 150 }).notNull(),

  description: varchar("description", { length: 500 }),

  /** ENG-003e connector reference — never credentials or secrets. */
  integrationRef: varchar("integration_ref", { length: 120 }),

  displayOrder: integer("display_order").default(0).notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
