/**
 * Purpose:
 * Configurable Case Priority catalogue with SLA target hours.
 *
 * Implementation Package:
 * BP-004 / IP-09 – Case & Service Request Management
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const crmCasePriority = pgTable("crm_case_priority", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  firstResponseTargetHours: integer("first_response_target_hours").notNull(),
  resolutionTargetHours: integer("resolution_target_hours").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
