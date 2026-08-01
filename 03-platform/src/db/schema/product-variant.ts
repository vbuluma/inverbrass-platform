/**
 * Purpose:
 * Sellable/versioned instances of a master product offering.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

import {
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

export const productVariant = pgTable(
  "product_variant",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    productId: uuid("product_id")
      .references(() => product.id)
      .notNull(),

    variantCode: varchar("variant_code", { length: 80 }).notNull(),

    variantName: varchar("variant_name", { length: 300 }).notNull(),

    status: varchar("status", { length: 50 }).notNull(),

    displayOrder: integer("display_order").default(0).notNull(),

    recordSource: varchar("record_source", { length: 50 })
      .default("PLATFORM_CREATED")
      .notNull(),

    combinationFingerprint: varchar("combination_fingerprint", { length: 500 }),

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
    uniqueIndex("product_variant_business_code_uidx")
      .on(table.businessId, table.variantCode)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("product_variant_product_fingerprint_uidx")
      .on(table.businessId, table.productId, table.combinationFingerprint)
      .where(
        sql`${table.deletedAt} IS NULL AND ${table.combinationFingerprint} IS NOT NULL`
      ),
  ]
);
