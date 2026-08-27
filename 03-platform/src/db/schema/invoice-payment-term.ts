/**
 * Purpose:
 * Configurable invoice payment terms. Net-day counts live on the term,
 * not as a hard-coded rule in BP-007 IP-04.
 *
 * Implementation Package:
 * BP-007 / IP-04 – Billing, Invoicing & Credit Sales
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const invoicePaymentTerm = pgTable("invoice_payment_term", {
  code: varchar("code", { length: 40 }).primaryKey(),

  name: varchar("name", { length: 120 }).notNull(),

  netDays: integer("net_days").notNull(),

  displayOrder: integer("display_order").default(0).notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
