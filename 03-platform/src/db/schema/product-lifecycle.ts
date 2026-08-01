/**
 * Purpose:
 * Product lifecycle metadata — governed state, versioning, approval, retirement.
 *
 * Implementation Package:
 * BP-003 / IP-008 – Product Lifecycle Management
 */

import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { product } from "./product";

export const productLifecycle = pgTable(
  "product_lifecycle",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    productId: uuid("product_id")
      .references(() => product.id)
      .notNull(),

    currentState: varchar("current_state", { length: 50 }).notNull(),

    previousState: varchar("previous_state", { length: 50 }),

    effectiveFrom: date("effective_from"),

    effectiveTo: date("effective_to"),

    approvalRequired: boolean("approval_required").default(false).notNull(),

    approvalStatus: varchar("approval_status", { length: 50 }),

    retirementReason: varchar("retirement_reason", { length: 100 }),

    replacementProductId: uuid("replacement_product_id").references(
      () => product.id
    ),

    versionNumber: varchar("version_number", { length: 20 })
      .default("1.0")
      .notNull(),

    majorVersion: integer("major_version").default(1).notNull(),

    minorVersion: integer("minor_version").default(0).notNull(),

    scheduledAction: varchar("scheduled_action", { length: 50 }),

    scheduledAt: date("scheduled_at"),

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
  },
  (table) => [
    uniqueIndex("product_lifecycle_product_uidx")
      .on(table.productId)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
