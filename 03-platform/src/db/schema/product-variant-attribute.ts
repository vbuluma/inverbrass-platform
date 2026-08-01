/**
 * Purpose:
 * Attribute overrides for product variants (consumes IP-004 definitions).
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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { productAttributeDefinition } from "./product-attribute-definition";
import { productVariant } from "./product-variant";

export const productVariantAttribute = pgTable(
  "product_variant_attribute",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    variantId: uuid("variant_id")
      .references(() => productVariant.id)
      .notNull(),

    attributeDefinitionId: uuid("attribute_definition_id")
      .references(() => productAttributeDefinition.id)
      .notNull(),

    attributeValue: jsonb("attribute_value"),

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
    uniqueIndex("product_variant_attribute_variant_definition_uidx")
      .on(table.businessId, table.variantId, table.attributeDefinitionId)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
