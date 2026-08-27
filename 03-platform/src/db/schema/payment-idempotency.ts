/**
 * Purpose:
 * Reusable payment-operation idempotency records (IP-01 foundation).
 * Retry/execution behaviour belongs to later payment IPs.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import {
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";

export const paymentIdempotency = pgTable(
  "payment_idempotency",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull(),

    operationType: varchar("operation_type", { length: 60 }).notNull(),

    resourceType: varchar("resource_type", { length: 60 }).notNull(),

    resourceId: uuid("resource_id").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),
  },
  (table) => [
    uniqueIndex("payment_idempotency_business_operation_key_uidx").on(
      table.businessId,
      table.operationType,
      table.idempotencyKey
    ),
  ]
);
