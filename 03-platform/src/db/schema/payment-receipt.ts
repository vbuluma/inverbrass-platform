/**
 * Purpose:
 * Immutable payment receipt evidence for a SUCCESSFUL payment transaction.
 * Amount comes from the payment transaction. Allocation is displayed from
 * IP-03. Invoice linkage is optional. Refunds are IP-06.
 *
 * Implementation Package:
 * BP-007 / IP-05 – Receipting & Payment Evidence
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
import { party } from "./party";
import { paymentChannel } from "./payment-channel";
import { paymentInvoice } from "./payment-invoice";
import { paymentMethod } from "./payment-method";
import { paymentNetwork } from "./payment-network";
import { paymentObligation } from "./payment-obligation";
import { paymentProvider } from "./payment-provider";
import { paymentTransaction } from "./payment-transaction";

export const paymentReceipt = pgTable(
  "payment_receipt",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    receiptNumber: varchar("receipt_number", { length: 80 }).notNull(),

    numberingPolicyId: uuid("numbering_policy_id").notNull(),

    paymentTransactionId: uuid("payment_transaction_id")
      .notNull()
      .references(() => paymentTransaction.id),

    paymentObligationId: uuid("payment_obligation_id")
      .notNull()
      .references(() => paymentObligation.id),

    customerId: uuid("customer_id").references(() => party.id),

    salesOrderId: uuid("sales_order_id").notNull(),

    orderNumber: varchar("order_number", { length: 80 }).notNull(),

    invoiceId: uuid("invoice_id").references(() => paymentInvoice.id),

    invoiceNumber: varchar("invoice_number", { length: 80 }),

    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currency.code),

    amount: numeric("amount", { precision: 20, scale: 6 }).notNull(),

    paymentDateTime: timestamp("payment_date_time", { withTimezone: true }).notNull(),

    methodId: uuid("method_id").references(() => paymentMethod.id),

    networkId: uuid("network_id").references(() => paymentNetwork.id),

    providerId: uuid("provider_id").references(() => paymentProvider.id),

    channelId: uuid("channel_id").references(() => paymentChannel.id),

    methodName: varchar("method_name", { length: 100 }),

    networkName: varchar("network_name", { length: 100 }),

    providerName: varchar("provider_name", { length: 150 }),

    channelName: varchar("channel_name", { length: 100 }),

    providerTransactionReference: varchar("provider_transaction_reference", {
      length: 160,
    }),

    internalPaymentTransactionNumber: varchar(
      "internal_payment_transaction_number",
      { length: 80 }
    ).notNull(),

    documentId: varchar("document_id", { length: 160 }),

    documentStorageKey: varchar("document_storage_key", { length: 240 }),

    documentStatus: varchar("document_status", { length: 40 }),

    status: varchar("status", { length: 50 }).notNull(),

    deliveryStatus: varchar("delivery_status", { length: 40 })
      .default("NONE")
      .notNull(),

    originalReceiptId: uuid("original_receipt_id"),

    idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull(),

    evidence: jsonb("evidence").$type<Record<string, unknown> | null>(),

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
    uniqueIndex("payment_receipt_business_number_uidx").on(
      table.businessId,
      table.receiptNumber
    ),
    uniqueIndex("payment_receipt_business_transaction_uidx").on(
      table.businessId,
      table.paymentTransactionId
    ),
    uniqueIndex("payment_receipt_business_idempotency_uidx").on(
      table.businessId,
      table.idempotencyKey
    ),
    index("payment_receipt_business_obligation_idx").on(
      table.businessId,
      table.paymentObligationId
    ),
  ]
);

export const paymentReceiptDelivery = pgTable(
  "payment_receipt_delivery",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    receiptId: uuid("receipt_id")
      .notNull()
      .references(() => paymentReceipt.id),

    channel: varchar("channel", { length: 40 }).notNull(),

    status: varchar("status", { length: 40 }).notNull(),

    failureReason: varchar("failure_reason", { length: 500 }),

    requestedAt: timestamp("requested_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),
  },
  (table) => [
    index("payment_receipt_delivery_business_receipt_idx").on(
      table.businessId,
      table.receiptId
    ),
  ]
);
