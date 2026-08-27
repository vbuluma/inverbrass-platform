/**
 * Purpose:
 * Product-specific attribute values (assignments).
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
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
import { product } from "./product";
import { productAttributeDefinition } from "./product-attribute-definition";

export const productAttributeAssignment = pgTable(
  "product_attribute_assignment",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    productId: uuid("product_id")
      .references(() => product.id)
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
    uniqueIndex("product_attribute_assignment_product_definition_uidx")
      .on(table.businessId, table.productId, table.attributeDefinitionId)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
