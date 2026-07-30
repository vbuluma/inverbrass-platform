/**
 * Purpose:
 * Master Product repository — single reusable record for every business offering.
 *
 * Design rationale:
 * Generic product master consumed by all verticals. Not inventory, pricing, or sales.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
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

import { business } from "./business";
import { party } from "./party";

export const product = pgTable(
  "product",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    productCode: varchar("product_code", { length: 80 }).notNull(),

    productName: varchar("product_name", { length: 300 }).notNull(),

    shortName: varchar("short_name", { length: 100 }),

    description: varchar("description", { length: 4000 }),

    productTypeCode: varchar("product_type_code", { length: 50 }).notNull(),

    statusCode: varchar("status_code", { length: 50 }).notNull(),

    ownerPartyId: uuid("owner_party_id").references(() => party.id),

    defaultCurrency: varchar("default_currency", { length: 3 }),

    launchDate: date("launch_date"),

    retirementDate: date("retirement_date"),

    isSellable: boolean("is_sellable").default(false).notNull(),

    isPurchasable: boolean("is_purchasable").default(false).notNull(),

    isBookable: boolean("is_bookable").default(false).notNull(),

    isRentable: boolean("is_rentable").default(false).notNull(),

    isSubscription: boolean("is_subscription").default(false).notNull(),

    isDigital: boolean("is_digital").default(false).notNull(),

    isActive: boolean("is_active").default(true).notNull(),

    recordSource: varchar("record_source", { length: 50 })
      .default("PLATFORM_CREATED")
      .notNull(),

    legacyCode: varchar("legacy_code", { length: 100 }),

    legacySystem: varchar("legacy_system", { length: 100 }),

    migrationDate: timestamp("migration_date", { withTimezone: true }),

    migrationBatch: varchar("migration_batch", { length: 100 }),

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
    uniqueIndex("product_business_code_uidx").on(
      table.businessId,
      table.productCode
    ),
  ]
);
