/**
 * Purpose:
 * BP-006 reusable sales-operation idempotency records.
 *
 * Mirrors payment_idempotency pattern for CREATE_DIRECT_SALE (SL-CUS-001).
 */

import {
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";

export const salesIdempotency = pgTable(
  "sales_idempotency",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull(),

    operationType: varchar("operation_type", { length: 60 }).notNull(),

    payloadHash: varchar("payload_hash", { length: 128 }).notNull(),

    resourceType: varchar("resource_type", { length: 60 }).notNull(),

    resourceId: uuid("resource_id").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),
  },
  (table) => [
    uniqueIndex("sales_idempotency_business_operation_key_uidx").on(
      table.businessId,
      table.operationType,
      table.idempotencyKey
    ),
  ]
);
