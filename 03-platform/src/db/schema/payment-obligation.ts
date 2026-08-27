/**
 * Purpose:
 * Payment obligation created from a BP-006 payment-ready contract.
 * Amount due is copied — never recalculated from sales-order lines.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import {
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
import { party } from "./party";
import { salesOrder } from "./sales-order";

export const paymentObligation = pgTable(
  "payment_obligation",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    obligationNumber: varchar("obligation_number", { length: 80 }).notNull(),

    salesOrderId: uuid("sales_order_id")
      .notNull()
      .references(() => salesOrder.id),

    orderNumber: varchar("order_number", { length: 80 }).notNull(),

    customerId: uuid("customer_id").references(() => party.id),

    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currency.code),

    amountDue: numeric("amount_due", { precision: 20, scale: 6 }).notNull(),

    paidAmount: numeric("paid_amount", { precision: 20, scale: 6 })
      .default("0")
      .notNull(),

    outstandingAmount: numeric("outstanding_amount", {
      precision: 20,
      scale: 6,
    }).notNull(),

    paymentStatus: varchar("payment_status", { length: 50 })
      .default("NOT_STARTED")
      .notNull(),

    financialInstructionType: varchar("financial_instruction_type", {
      length: 40,
    }).notNull(),

    commercialContractId: varchar("commercial_contract_id", {
      length: 120,
    }).notNull(),

    snapshotId: uuid("snapshot_id").notNull(),

    paymentReadyContractRef: varchar("payment_ready_contract_ref", {
      length: 160,
    }).notNull(),

    /** Copied from the payment-ready contract for provenance. Never summed. */
    lineBreakdown: jsonb("line_breakdown"),

    paymentReadyContractPayload: jsonb("payment_ready_contract_payload"),

    providerTransactionReference: varchar("provider_transaction_reference", {
      length: 160,
    }),

    idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull(),

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
    uniqueIndex("payment_obligation_business_number_uidx").on(
      table.businessId,
      table.obligationNumber
    ),
    uniqueIndex("payment_obligation_business_instruction_uidx").on(
      table.businessId,
      table.salesOrderId,
      table.financialInstructionType
    ),
    uniqueIndex("payment_obligation_business_idempotency_uidx").on(
      table.businessId,
      table.idempotencyKey
    ),
  ]
);
