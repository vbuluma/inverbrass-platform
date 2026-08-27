/**
 * Purpose:
 * Post-payment refund/reversal financial event. References an immutable
 * original payment. Does not overwrite payment, receipt, or allocation
 * history.
 *
 * Implementation Package:
 * BP-007 / IP-06 – Refunds, Reversals & Adjustments
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
import { paymentChannel } from "./payment-channel";
import { paymentInvoice } from "./payment-invoice";
import { paymentMethod } from "./payment-method";
import { paymentNetwork } from "./payment-network";
import { paymentObligation } from "./payment-obligation";
import { paymentProvider } from "./payment-provider";
import { paymentReceipt } from "./payment-receipt";
import { paymentTransaction } from "./payment-transaction";

export const paymentRefund = pgTable(
  "payment_refund",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    refundNumber: varchar("refund_number", { length: 80 }).notNull(),

    numberingPolicyId: uuid("numbering_policy_id").notNull(),

    originalPaymentTransactionId: uuid("original_payment_transaction_id")
      .notNull()
      .references(() => paymentTransaction.id),

    originalPaymentReference: varchar("original_payment_reference", {
      length: 80,
    }).notNull(),

    paymentObligationId: uuid("payment_obligation_id")
      .notNull()
      .references(() => paymentObligation.id),

    originalReceiptId: uuid("original_receipt_id").references(() => paymentReceipt.id),

    originatingFinancialInstructionId: uuid("originating_financial_instruction_id"),

    invoiceId: uuid("invoice_id").references(() => paymentInvoice.id),

    refundType: varchar("refund_type", { length: 40 }).notNull(),

    amount: numeric("amount", { precision: 20, scale: 6 }).notNull(),

    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currency.code),

    methodId: uuid("method_id").references(() => paymentMethod.id),

    networkId: uuid("network_id").references(() => paymentNetwork.id),

    providerId: uuid("provider_id").references(() => paymentProvider.id),

    channelId: uuid("channel_id").references(() => paymentChannel.id),

    methodName: varchar("method_name", { length: 100 }),

    networkName: varchar("network_name", { length: 100 }),

    providerName: varchar("provider_name", { length: 150 }),

    channelName: varchar("channel_name", { length: 100 }),

    status: varchar("status", { length: 50 }).notNull(),

    reason: varchar("reason", { length: 500 }).notNull(),

    providerRefundReference: varchar("provider_refund_reference", { length: 160 }),

    idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull(),

    requestedBy: uuid("requested_by"),

    approvedBy: uuid("approved_by"),

    initiatedAt: timestamp("initiated_at", { withTimezone: true }),

    completedAt: timestamp("completed_at", { withTimezone: true }),

    failureCode: varchar("failure_code", { length: 80 }),

    failureReason: varchar("failure_reason", { length: 500 }),

    providerMetadata: jsonb("provider_metadata").$type<Record<string, unknown> | null>(),

    documentId: varchar("document_id", { length: 160 }),

    documentStorageKey: varchar("document_storage_key", { length: 240 }),

    documentStatus: varchar("document_status", { length: 40 }),

    captureMode: varchar("capture_mode", { length: 40 }).notNull(),

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
    uniqueIndex("payment_refund_business_number_uidx").on(
      table.businessId,
      table.refundNumber
    ),
    uniqueIndex("payment_refund_business_idempotency_uidx").on(
      table.businessId,
      table.idempotencyKey
    ),
    index("payment_refund_business_transaction_idx").on(
      table.businessId,
      table.originalPaymentTransactionId
    ),
    index("payment_refund_business_obligation_idx").on(
      table.businessId,
      table.paymentObligationId
    ),
  ]
);
