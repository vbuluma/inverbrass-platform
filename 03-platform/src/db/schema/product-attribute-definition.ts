/**
 * Purpose:
 * Configurable attribute definitions — metadata schema for product characteristics.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { attributeGroup } from "./attribute-group";
import { business } from "./business";

export const productAttributeDefinition = pgTable(
  "product_attribute_definition",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    attributeGroupId: uuid("attribute_group_id")
      .references(() => attributeGroup.id)
      .notNull(),

    code: varchar("code", { length: 80 }).notNull(),

    name: varchar("name", { length: 300 }).notNull(),

    description: varchar("description", { length: 4000 }),

    dataType: varchar("data_type", { length: 50 }).notNull(),

    validationRule: jsonb("validation_rule"),

    defaultValue: text("default_value"),

    displayOrder: integer("display_order").default(0).notNull(),

    isMandatory: boolean("is_mandatory").default(false).notNull(),

    isReadOnly: boolean("is_read_only").default(false).notNull(),

    isHidden: boolean("is_hidden").default(false).notNull(),

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
    uniqueIndex("product_attribute_definition_business_code_uidx")
      .on(table.businessId, table.code)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("product_attribute_definition_group_name_uidx")
      .on(table.attributeGroupId, table.name)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
