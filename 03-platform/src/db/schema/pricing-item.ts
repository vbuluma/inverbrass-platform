/**
 * Purpose:
 * Business-scoped offering price items — prices are never stored on the product master.
 *
 * Architecture:
 * Reusable platform pricing capability consumed by BP-003 Offering Pricing.
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
 */

import {
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { currency } from "./currency";
import { pricingCatalogue } from "./pricing-catalogue";
import { product } from "./product";

export const pricingItem = pgTable("pricing_item", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),

  offeringId: uuid("offering_id")
    .notNull()
    .references(() => product.id),

  pricingCatalogueId: uuid("pricing_catalogue_id")
    .notNull()
    .references(() => pricingCatalogue.id),

  currencyCode: varchar("currency_code", { length: 3 })
    .notNull()
    .references(() => currency.code),

  unitPrice: numeric("unit_price", { precision: 20, scale: 6 }).notNull(),

  minimumPrice: numeric("minimum_price", { precision: 20, scale: 6 }),

  maximumPrice: numeric("maximum_price", { precision: 20, scale: 6 }),

  pricingMethod: varchar("pricing_method", { length: 80 }).notNull(),

  customerSegment: varchar("customer_segment", { length: 100 }),

  salesChannel: varchar("sales_channel", { length: 100 }),

  region: varchar("region", { length: 100 }),

  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),

  effectiveTo: timestamp("effective_to", { withTimezone: true }),

  status: varchar("status", { length: 50 }).notNull(),

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
