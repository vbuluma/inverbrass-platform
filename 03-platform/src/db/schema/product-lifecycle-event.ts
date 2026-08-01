/**
 * Purpose:
 * Append-only lifecycle event history for products.
 *
 * Implementation Package:
 * BP-003 / IP-008 – Product Lifecycle Management
 */

import {
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { product } from "./product";

export const productLifecycleEvent = pgTable("product_lifecycle_event", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),

  productId: uuid("product_id")
    .references(() => product.id)
    .notNull(),

  eventType: varchar("event_type", { length: 80 }).notNull(),

  oldState: varchar("old_state", { length: 50 }),

  newState: varchar("new_state", { length: 50 }),

  reason: varchar("reason", { length: 500 }),

  performedBy: uuid("performed_by"),

  performedAt: timestamp("performed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  metadata: jsonb("metadata"),
});
