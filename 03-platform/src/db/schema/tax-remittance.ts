/**
 * Purpose:
 * Remittance / payment recording against a tax obligation.
 * Records outcome only — payment execution remains BP-007.
 *
 * Implementation Package:
 * BP-005 / IP-11 – Tax Compliance, Remittance & Evidence Management
 */

import {
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { taxObligation } from "./tax-obligation";

export const taxRemittance = pgTable(
  "tax_remittance",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => taxObligation.id),

    expectedAmount: numeric("expected_amount", {
      precision: 18,
      scale: 6,
    }),

    amountRemitted: numeric("amount_remitted", {
      precision: 18,
      scale: 6,
    }),

    outstandingAmount: numeric("outstanding_amount", {
      precision: 18,
      scale: 6,
    }),

    remittanceDate: date("remittance_date"),

    dueDate: date("due_date"),

    paymentReference: varchar("payment_reference", { length: 120 }),

    authorityCode: varchar("authority_code", { length: 40 }),

    status: varchar("status", { length: 40 }).notNull(),

    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("tax_remittance_business_idx").on(table.businessId),
    index("tax_remittance_obligation_idx").on(table.obligationId),
  ]
);
