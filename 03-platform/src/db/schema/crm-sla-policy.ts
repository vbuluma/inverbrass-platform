/**
 * Purpose:
 * CRM SLA policy administration stub (ENG-003n foundation).
 *
 * Implementation Package:
 * BP-004 / IP-013 – CRM Governance & Administration
 */

import {
  boolean,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";

export const crmSlaPolicy = pgTable("crm_sla_policy", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),

  entityTypeCode: varchar("entity_type_code", { length: 50 }).notNull(),

  priorityCode: varchar("priority_code", { length: 50 }),

  name: varchar("name", { length: 200 }).notNull(),

  firstResponseTargetHours: integer("first_response_target_hours"),

  resolutionTargetHours: integer("resolution_target_hours").notNull(),

  pauseReasonCodes: jsonb("pause_reason_codes"),

  escalationEnabled: boolean("escalation_enabled").default(true).notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
