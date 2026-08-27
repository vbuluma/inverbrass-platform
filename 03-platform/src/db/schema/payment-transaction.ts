/**
 * Purpose:
 * Individual payment transaction / attempt against a payment obligation.
 * Lifecycle and provider references are owned here; settlement is not.
 *
 * Implementation Package:
 * BP-007 / IP-02 – Payment Initiation & Processing
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

export const paymentTransaction = pgTable(
  "payment_transaction",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => paymentObligation.id),

    transactionNumber: varchar("transaction_number", { length: 80 }).notNull(),

    methodId: uuid("method_id").references(() => paymentMethod.id),

    networkId: uuid("network_id").references(() => paymentNetwork.id),

    providerId: uuid("provider_id").references(() => paymentProvider.id),

    channelId: uuid("channel_id").references(() => paymentChannel.id),

    methodName: varchar("method_name", { length: 100 }),

    networkName: varchar("network_name", { length: 100 }),

    providerName: varchar("provider_name", { length: 150 }),

    channelName: varchar("channel_name", { length: 100 }),

    amount: numeric("amount", { precision: 20, scale: 6 }).notNull(),

    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currency.code),

    status: varchar("status", { length: 50 }).notNull(),

    captureMode: varchar("capture_mode", { length: 20 }).notNull(),

    providerTransactionReference: varchar("provider_transaction_reference", {
      length: 160,
    }),

    idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull(),

    initiatedAt: timestamp("initiated_at", { withTimezone: true }),

    completedAt: timestamp("completed_at", { withTimezone: true }),

    failureCode: varchar("failure_code", { length: 80 }),

    failureReason: varchar("failure_reason", { length: 500 }),

    providerResponseMetadata: jsonb("provider_response_metadata"),

    outcomeMismatch: boolean("outcome_mismatch").default(false).notNull(),

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
    uniqueIndex("payment_transaction_business_number_uidx").on(
      table.businessId,
      table.transactionNumber
    ),
    uniqueIndex("payment_transaction_business_idempotency_uidx").on(
      table.businessId,
      table.idempotencyKey
    ),
    uniqueIndex("payment_transaction_business_provider_ref_uidx")
      .on(table.businessId, table.providerTransactionReference)
      .where(sql`${table.providerTransactionReference} is not null`),
    index("payment_transaction_business_obligation_idx").on(
      table.businessId,
      table.obligationId
    ),
  ]
);
