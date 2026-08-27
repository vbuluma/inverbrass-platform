/**
 * Purpose:
 * Select / multi-select options for attribute definitions.
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
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { productAttributeDefinition } from "./product-attribute-definition";

export const productAttributeOption = pgTable(
  "product_attribute_option",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    attributeDefinitionId: uuid("attribute_definition_id")
      .references(() => productAttributeDefinition.id)
      .notNull(),

    optionCode: varchar("option_code", { length: 80 }).notNull(),

    optionLabel: varchar("option_label", { length: 300 }).notNull(),

    displayOrder: integer("display_order").default(0).notNull(),

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
  },
  (table) => [
    uniqueIndex("product_attribute_option_definition_code_uidx")
      .on(table.attributeDefinitionId, table.optionCode)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
