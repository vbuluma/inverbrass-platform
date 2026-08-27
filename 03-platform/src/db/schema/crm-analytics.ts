/**
 * Purpose:
 * CRM analytics metric definition and snapshot persistence.
 *
 * Implementation Package:
 * BP-004 / IP-12 – CRM Analytics & Dashboards (Phase 12.1)
 */

import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { party } from "./party";

export const crmMetricDefinition = pgTable("crm_metric_definition", {
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
});

export const crmMetricSnapshot = pgTable("crm_metric_snapshot", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),

  metricDefinitionId: uuid("metric_definition_id")
    .notNull()
    .references(() => crmMetricDefinition.id),

  /** Optional party scope for Customer 360 analytics */
  partyId: uuid("party_id").references(() => party.id),

  snapshotPeriod: varchar("snapshot_period", { length: 20 }).notNull(),

  snapshotDate: date("snapshot_date").notNull(),

  metricValue: numeric("metric_value", { precision: 20, scale: 6 }).notNull(),

  currencyCode: varchar("currency_code", { length: 3 }),

  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  createdBy: uuid("created_by"),
});
