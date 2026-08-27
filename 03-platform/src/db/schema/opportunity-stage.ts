/**
 * Purpose:
 * Pipeline stages with default probability for forecasting.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { opportunityPipeline } from "./opportunity-pipeline";

export const opportunityStage = pgTable("opportunity_stage", {
  id: uuid("id").defaultRandom().primaryKey(),
  pipelineId: uuid("pipeline_id")
    .references(() => opportunityPipeline.id)
    .notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }),
  displayOrder: integer("display_order").default(0).notNull(),
  defaultProbability: integer("default_probability").default(0).notNull(),
  isClosedWon: boolean("is_closed_won").default(false).notNull(),
  isClosedLost: boolean("is_closed_lost").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
