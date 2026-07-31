/**
 * Purpose:
 * Business-scoped units of measure with conversion factors to category base.
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
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
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { unitCategory } from "./unit-category";

export const unitOfMeasure = pgTable(
  "unit_of_measure",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    categoryId: uuid("category_id")
      .references(() => unitCategory.id)
      .notNull(),

    code: varchar("code", { length: 80 }).notNull(),

    name: varchar("name", { length: 300 }).notNull(),

    symbol: varchar("symbol", { length: 20 }).notNull(),

    conversionFactor: numeric("conversion_factor", {
      precision: 20,
      scale: 10,
    }).notNull(),

    decimalPrecision: integer("decimal_precision").default(2).notNull(),

    roundingRule: varchar("rounding_rule", { length: 50 })
      .default("HALF_UP")
      .notNull(),

    isBaseUnit: boolean("is_base_unit").default(false).notNull(),

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
    uniqueIndex("unit_of_measure_business_code_uidx")
      .on(table.businessId, table.code)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("unit_of_measure_category_symbol_uidx")
      .on(table.categoryId, table.symbol)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
