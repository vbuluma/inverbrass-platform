/**
 * Purpose:
 * Controlled credit/adjustment linkage for an invoice. Not a refund
 * (IP-06) and not a collections case (SC-032).
 *
 * Implementation Package:
 * BP-007 / IP-04 – Billing, Invoicing & Credit Sales
 */

import {
  index,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { currency } from "./currency";
import { paymentInvoice } from "./payment-invoice";

export const invoiceAdjustment = pgTable(
  "invoice_adjustment",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => paymentInvoice.id),

    adjustmentType: varchar("adjustment_type", { length: 40 }).notNull(),

    status: varchar("status", { length: 40 }).notNull(),

    amount: numeric("amount", { precision: 20, scale: 6 }).notNull(),

    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currency.code),

    reason: varchar("reason", { length: 500 }).notNull(),

    handedOffToIp06: varchar("handed_off_to_ip06", { length: 10 })
      .default("NO")
      .notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),
  },
  (table) => [
    index("invoice_adjustment_business_invoice_idx").on(
      table.businessId,
      table.invoiceId
    ),
  ]
);
