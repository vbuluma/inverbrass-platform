/**
 * Purpose:
 * Allocation of a successful payment transaction to a payment obligation.
 * Does not change the original payment transaction amount or status.
 *
 * Implementation Package:
 * BP-007 / IP-03 – Partial, Split Payment & Allocation
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
import { paymentObligation } from "./payment-obligation";
import { paymentTransaction } from "./payment-transaction";

export const paymentAllocation = pgTable(
  "payment_allocation",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => paymentObligation.id),

    paymentTransactionId: uuid("payment_transaction_id")
      .notNull()
      .references(() => paymentTransaction.id),

    allocationNumber: varchar("allocation_number", { length: 80 }).notNull(),

    /** Reserved for later targets (invoice). IP-03 only writes OBLIGATION. */
    targetType: varchar("target_type", { length: 40 }).default("OBLIGATION").notNull(),

    allocatedAmount: numeric("allocated_amount", {
      precision: 20,
      scale: 6,
    }).notNull(),

    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currency.code),

    status: varchar("status", { length: 50 }).notNull(),

    idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull(),

    reason: varchar("reason", { length: 500 }),

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
    uniqueIndex("payment_allocation_business_number_uidx").on(
      table.businessId,
      table.allocationNumber
    ),
    uniqueIndex("payment_allocation_business_idempotency_uidx").on(
      table.businessId,
      table.idempotencyKey
    ),
    index("payment_allocation_business_obligation_idx").on(
      table.businessId,
      table.obligationId
    ),
    index("payment_allocation_business_transaction_idx").on(
      table.businessId,
      table.paymentTransactionId
    ),
  ]
);
