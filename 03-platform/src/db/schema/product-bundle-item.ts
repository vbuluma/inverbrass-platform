/**
 * Purpose:
 * Line items within a product bundle.
 *
 * Implementation Package:
 * BP-003 / IP-006 – Bundles & Packages Engine
 */

import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { product } from "./product";
import { productBundle } from "./product-bundle";
import { productVariant } from "./product-variant";

export const productBundleItem = pgTable(
  "product_bundle_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    bundleId: uuid("bundle_id")
      .references(() => productBundle.id)
      .notNull(),

    productId: uuid("product_id")
      .references(() => product.id)
      .notNull(),

    variantId: uuid("variant_id").references(() => productVariant.id),

    quantity: numeric("quantity", { precision: 18, scale: 4 })
      .default("1")
      .notNull(),

    mandatory: boolean("mandatory").default(true).notNull(),

    displayOrder: integer("display_order").default(0).notNull(),

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
    uniqueIndex("product_bundle_item_bundle_product_variant_uidx")
      .on(
        table.bundleId,
        table.productId,
        sql`COALESCE(${table.variantId}, '00000000-0000-0000-0000-000000000000'::uuid)`
      )
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
