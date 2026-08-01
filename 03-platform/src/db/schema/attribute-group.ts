/**
 * Purpose:
 * Business-scoped attribute groups for metadata-driven product characteristics.
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

import { business } from "./business";

export const attributeGroup = pgTable(
  "attribute_group",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    code: varchar("code", { length: 80 }).notNull(),

    name: varchar("name", { length: 300 }).notNull(),

    description: varchar("description", { length: 4000 }),

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
    uniqueIndex("attribute_group_business_code_uidx")
      .on(table.businessId, table.code)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
