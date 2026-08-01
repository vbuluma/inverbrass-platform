/**
 * Purpose:
 * Configurable KPI definitions for Offering Analytics (per business).
 *
 * Architecture:
 * Reusable analytics framework consumed by BP-003; extensible by future Build Packs.
 *
 * Implementation Package:
 * BP-003 / IP-012 – Offering Analytics & Performance
 */

import { sql } from "drizzle-orm";
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

import { business } from "./business";

export const offeringMetricDefinition = pgTable(
  "offering_metric_definition",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    code: varchar("code", { length: 80 }).notNull(),

    name: varchar("name", { length: 300 }).notNull(),

    description: varchar("description", { length: 4000 }),

    metricCategory: varchar("metric_category", { length: 80 }).notNull(),

    calculationMethod: varchar("calculation_method", { length: 80 }).notNull(),

    unitOfMeasure: varchar("unit_of_measure", { length: 80 }),

    isActive: boolean("is_active").default(true).notNull(),

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
    uniqueIndex("offering_metric_definition_business_code_uidx")
      .on(table.businessId, table.code)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
