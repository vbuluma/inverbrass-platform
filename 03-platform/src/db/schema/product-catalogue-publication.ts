/**
 * Purpose:
 * Per-product, per-channel catalogue publication rules.
 *
 * Implementation Package:
 * BP-003 / IP-007 – Digital Catalogue Engine
 */

import {
  boolean,
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
import { catalogueChannel } from "./catalogue-channel";
import { product } from "./product";

export const productCataloguePublication = pgTable(
  "product_catalogue_publication",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    productId: uuid("product_id")
      .references(() => product.id)
      .notNull(),

    channelId: uuid("channel_id")
      .references(() => catalogueChannel.id)
      .notNull(),

    published: boolean("published").default(false).notNull(),

    visibility: varchar("visibility", { length: 80 }).default("PUBLIC").notNull(),

    publishFrom: timestamp("publish_from", { withTimezone: true }),

    publishTo: timestamp("publish_to", { withTimezone: true }),

    featured: boolean("featured").default(false).notNull(),

    recommended: boolean("recommended").default(false).notNull(),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    createdBy: uuid("created_by"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

    updatedBy: uuid("updated_by"),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("product_catalogue_publication_business_product_channel_uidx")
      .on(table.businessId, table.productId, table.channelId)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
