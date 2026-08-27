/**
 * Purpose:
 * Formal customer invoice linked to an existing payment obligation.
 * Amounts come from the obligation; paid/outstanding are derived from
 * IP-03 allocations. Not a second obligation or allocation mechanism.
 *
 * Implementation Package:
 * BP-007 / IP-04 – Billing, Invoicing & Credit Sales
 */

import {
  index,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { currency } from "./currency";
import { invoicePaymentTerm } from "./invoice-payment-term";
import { party } from "./party";
import { paymentObligation } from "./payment-obligation";

export const paymentInvoice = pgTable(
  "payment_invoice",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => paymentObligation.id),

    salesOrderId: uuid("sales_order_id").notNull(),

    orderNumber: varchar("order_number", { length: 80 }).notNull(),

    customerId: uuid("customer_id").references(() => party.id),

    invoiceNumber: varchar("invoice_number", { length: 80 }).notNull(),

    numberingPolicyId: uuid("numbering_policy_id").notNull(),

    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currency.code),

    invoiceAmount: numeric("invoice_amount", {
      precision: 20,
      scale: 6,
    }).notNull(),

    paidAmount: numeric("paid_amount", { precision: 20, scale: 6 })
      .default("0")
      .notNull(),

    outstandingAmount: numeric("outstanding_amount", {
      precision: 20,
      scale: 6,
    }).notNull(),

    openingPaidAmount: numeric("opening_paid_amount", {
      precision: 20,
      scale: 6,
    })
      .default("0")
      .notNull(),

    amountDueSnapshot: numeric("amount_due_snapshot", {
      precision: 20,
      scale: 6,
    }).notNull(),

    commercialContractId: varchar("commercial_contract_id", {
      length: 120,
    }).notNull(),

    snapshotId: uuid("snapshot_id").notNull(),

    paymentTermCode: varchar("payment_term_code", { length: 40 })
      .notNull()
      .references(() => invoicePaymentTerm.code),

    issueDate: timestamp("issue_date", { withTimezone: true }),

    dueDate: timestamp("due_date", { withTimezone: true }),

    status: varchar("status", { length: 50 }).notNull(),

    documentId: varchar("document_id", { length: 160 }),

    documentStatus: varchar("document_status", { length: 40 }),

    cancellationReason: varchar("cancellation_reason", { length: 500 }),

    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    cancelledBy: uuid("cancelled_by"),

    idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull(),

    provenance: jsonb("provenance").$type<Record<string, unknown> | null>(),

    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),

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
    uniqueIndex("payment_invoice_business_number_uidx").on(
      table.businessId,
      table.invoiceNumber
    ),
    uniqueIndex("payment_invoice_business_idempotency_uidx").on(
      table.businessId,
      table.idempotencyKey
    ),
    index("payment_invoice_business_obligation_idx").on(
      table.businessId,
      table.obligationId
    ),
    index("payment_invoice_business_status_idx").on(table.businessId, table.status),
  ]
);
