/**
 * Purpose:
 * Provider settlement tracking for a successful payment. Independent of
 * payment status. Reconciliation matching belongs to ENG-008.
 *
 * Implementation Package:
 * BP-007 / IP-07 – Settlement & Reconciliation Handoff
 */

import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { currency } from "./currency";
import { paymentChannel } from "./payment-channel";
import { paymentMethod } from "./payment-method";
import { paymentNetwork } from "./payment-network";
import { paymentObligation } from "./payment-obligation";
import { paymentProvider } from "./payment-provider";
import { paymentTransaction } from "./payment-transaction";

export const paymentSettlement = pgTable(
  "payment_settlement",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    paymentTransactionId: uuid("payment_transaction_id")
      .notNull()
      .references(() => paymentTransaction.id),

    paymentObligationId: uuid("payment_obligation_id")
      .notNull()
      .references(() => paymentObligation.id),

    settlementStatus: varchar("settlement_status", { length: 50 }).notNull(),

    expectedAmount: numeric("expected_amount", { precision: 20, scale: 6 }).notNull(),

    receivedAmount: numeric("received_amount", { precision: 20, scale: 6 }),

    varianceAmount: numeric("variance_amount", { precision: 20, scale: 6 }),

    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currency.code),

    settlementReference: varchar("settlement_reference", { length: 160 }),

    settlementBatchReference: varchar("settlement_batch_reference", {
      length: 160,
    }),

    settlementDate: timestamp("settlement_date", { withTimezone: true }),

    receivedAt: timestamp("received_at", { withTimezone: true }),

    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),

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

    providerSettlementMetadata: jsonb("provider_settlement_metadata").$type<
      Record<string, unknown> | null
    >(),

    exceptionFlag: boolean("exception_flag").default(false).notNull(),

    exceptionCode: varchar("exception_code", { length: 80 }),

    exceptionReason: varchar("exception_reason", { length: 500 }),

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
    uniqueIndex("payment_settlement_business_transaction_uidx").on(
      table.businessId,
      table.paymentTransactionId
    ),
    uniqueIndex("payment_settlement_business_idempotency_uidx").on(
      table.businessId,
      table.idempotencyKey
    ),
    uniqueIndex("payment_settlement_business_reference_uidx")
      .on(table.businessId, table.settlementReference)
      .where(sql`${table.settlementReference} is not null`),
    index("payment_settlement_business_batch_idx").on(
      table.businessId,
      table.settlementBatchReference
    ),
    index("payment_settlement_business_obligation_idx").on(
      table.businessId,
      table.paymentObligationId
    ),
  ]
);
