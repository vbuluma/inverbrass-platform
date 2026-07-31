/**
 * Purpose:
 * Business-scoped unit categories (Quantity, Weight, Volume, etc.).
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
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

export const unitCategory = pgTable(
  "unit_category",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    code: varchar("code", { length: 80 }).notNull(),

    name: varchar("name", { length: 300 }).notNull(),

    description: varchar("description", { length: 4000 }),

    baseUnitId: uuid("base_unit_id"),

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
    uniqueIndex("unit_category_business_code_uidx")
      .on(table.businessId, table.code)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
