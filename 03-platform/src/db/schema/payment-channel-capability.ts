/**
 * Purpose:
 * Provider/channel capability and limit metadata consumed via ENG-006.
 * Limits are configuration — never hard-coded in BP-007 business rules.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import {
  boolean,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { paymentChannel } from "./payment-channel";
import { paymentProvider } from "./payment-provider";

export const paymentChannelCapability = pgTable(
  "payment_channel_capability",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    paymentChannelId: uuid("payment_channel_id")
      .references(() => paymentChannel.id)
      .notNull(),

    paymentProviderId: uuid("payment_provider_id")
      .references(() => paymentProvider.id)
      .notNull(),

    minAmount: numeric("min_amount", { precision: 20, scale: 6 }),

    maxAmount: numeric("max_amount", { precision: 20, scale: 6 }),

    dailyLimit: numeric("daily_limit", { precision: 20, scale: 6 }),

    transactionLimit: numeric("transaction_limit", { precision: 20, scale: 6 }),

    supportedCurrencies: jsonb("supported_currencies").$type<string[] | null>(),

    supportsInitiation: boolean("supports_initiation").default(true).notNull(),

    supportsRefund: boolean("supports_refund").default(false).notNull(),

    supportsStatusQuery: boolean("supports_status_query").default(false).notNull(),

    isAvailable: boolean("is_available").default(true).notNull(),

    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("payment_channel_capability_channel_uidx").on(table.paymentChannelId),
  ]
);
