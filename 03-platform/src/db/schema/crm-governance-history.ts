/**
 * Purpose:
 * Immutable CRM governance change history (append-only).
 *
 * Implementation Package:
 * BP-004 / IP-013 – CRM Governance & Administration
 */

import {
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { crmGovernance } from "./crm-governance";

export const crmGovernanceHistory = pgTable("crm_governance_history", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),

  crmGovernanceId: uuid("crm_governance_id")
    .notNull()
    .references(() => crmGovernance.id),

  changeType: varchar("change_type", { length: 100 }).notNull(),

  oldValue: varchar("old_value", { length: 4000 }),

  newValue: varchar("new_value", { length: 4000 }),

  changedBy: uuid("changed_by"),

  changeDate: timestamp("change_date", { withTimezone: true })
    .defaultNow()
    .notNull(),

  metadata: jsonb("metadata"),
});
