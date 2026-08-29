/**
 * Purpose:
 * Tenant-scoped idempotency for inventory inbound posting.
 * Prevents duplicate ledger movements from repeated post requests.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import {
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";

export const inventoryIdempotency = pgTable(
  "inventory_idempotency",
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
    uniqueIndex("inventory_idempotency_business_operation_key_uidx").on(
      table.businessId,
      table.operationType,
      table.idempotencyKey
    ),
  ]
);
