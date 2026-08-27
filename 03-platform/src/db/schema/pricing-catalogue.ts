/**
 * Purpose:
 * Business-scoped pricing catalogues (price lists).
 *
 * Architecture:
 * Reusable platform pricing capability consumed by BP-003 Offering Pricing.
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
 */

import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { currency } from "./currency";

export const pricingCatalogue = pgTable(
  "pricing_catalogue",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    code: varchar("code", { length: 80 }).notNull(),

    name: varchar("name", { length: 300 }).notNull(),

    description: varchar("description", { length: 4000 }),

    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currency.code),

    status: varchar("status", { length: 50 }).notNull(),

    effectiveFrom: timestamp("effective_from", { withTimezone: true }),

    effectiveTo: timestamp("effective_to", { withTimezone: true }),

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
    uniqueIndex("pricing_catalogue_business_code_uidx")
      .on(table.businessId, table.code)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
