/**
 * Purpose:
 * Composite commercial offerings composed of products and variants.
 *
 * Implementation Package:
 * BP-003 / IP-006 – Bundles & Packages Engine
 */

import {
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

export const productBundle = pgTable(
  "product_bundle",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    bundleCode: varchar("bundle_code", { length: 80 }).notNull(),

    bundleName: varchar("bundle_name", { length: 300 }).notNull(),

    bundleType: varchar("bundle_type", { length: 80 }).notNull(),

    statusCode: varchar("status_code", { length: 50 }).notNull(),

    ownerPartyId: uuid("owner_party_id"),

    description: varchar("description", { length: 4000 }),

    effectiveFrom: date("effective_from"),

    effectiveTo: date("effective_to"),

    pricingStrategy: varchar("pricing_strategy", { length: 80 })
      .default("SUM_OF_ITEMS")
      .notNull(),

    availabilityType: varchar("availability_type", { length: 80 })
      .default("ACTIVE")
      .notNull(),

    recordSource: varchar("record_source", { length: 50 })
      .default("PLATFORM_CREATED")
      .notNull(),

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
    uniqueIndex("product_bundle_business_code_uidx")
      .on(table.businessId, table.bundleCode)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
