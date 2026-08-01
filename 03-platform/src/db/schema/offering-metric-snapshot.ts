/**
 * Purpose:
 * Immutable offering metric snapshots — append-only calculated values.
 *
 * Architecture:
 * Reusable analytics framework consumed by BP-003; extensible by future Build Packs.
 *
 * Implementation Package:
 * BP-003 / IP-012 – Offering Analytics & Performance
 */

import {
  date,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { offeringMetricDefinition } from "./offering-metric-definition";
import { product } from "./product";

export const offeringMetricSnapshot = pgTable(
  "offering_metric_snapshot",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    offeringId: uuid("offering_id")
      .notNull()
      .references(() => product.id),

    metricDefinitionId: uuid("metric_definition_id")
      .notNull()
      .references(() => offeringMetricDefinition.id),

    snapshotPeriod: varchar("snapshot_period", { length: 20 }).notNull(),

    snapshotDate: date("snapshot_date").notNull(),

    metricValue: numeric("metric_value", { precision: 20, scale: 6 }).notNull(),

    currencyCode: varchar("currency_code", { length: 3 }),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),
  },
  (table) => [
    uniqueIndex("offering_metric_snapshot_unique_uidx").on(
      table.businessId,
      table.offeringId,
      table.metricDefinitionId,
      table.snapshotPeriod,
      table.snapshotDate
    ),
  ]
);
