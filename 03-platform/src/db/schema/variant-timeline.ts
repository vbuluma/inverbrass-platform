/**
 * Purpose:
 * Timeline events for product variant lifecycle and configuration changes.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

import {
  boolean,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { productVariant } from "./product-variant";

export const variantTimeline = pgTable("variant_timeline", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),

  variantId: uuid("variant_id")
    .references(() => productVariant.id)
    .notNull(),

  eventDateTime: timestamp("event_date_time", { withTimezone: true }).notNull(),

  eventType: varchar("event_type", { length: 100 }).notNull(),

  eventCategory: varchar("event_category", { length: 50 }).notNull(),

  sourceModule: varchar("source_module", { length: 100 }).notNull(),

  referenceEntity: varchar("reference_entity", { length: 100 }),

  referenceId: uuid("reference_id"),

  summary: varchar("summary", { length: 500 }).notNull(),

  description: varchar("description", { length: 4000 }),

  performedByUserId: uuid("performed_by_user_id"),

  performedByName: varchar("performed_by_name", { length: 200 }),

  visibility: varchar("visibility", { length: 50 }).notNull(),

  systemGenerated: boolean("system_generated").default(true).notNull(),

  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  createdBy: uuid("created_by"),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedBy: uuid("updated_by"),

  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  version: integer("version").default(1).notNull(),
});
