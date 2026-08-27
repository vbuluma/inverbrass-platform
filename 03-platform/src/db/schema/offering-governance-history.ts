/**
 * Purpose:
 * Immutable offering governance change history (append-only).
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

import {
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { offeringGovernance } from "./offering-governance";

export const offeringGovernanceHistory = pgTable("offering_governance_history", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),

  offeringGovernanceId: uuid("offering_governance_id")
    .notNull()
    .references(() => offeringGovernance.id),

  changeType: varchar("change_type", { length: 100 }).notNull(),

  oldValue: varchar("old_value", { length: 4000 }),

  newValue: varchar("new_value", { length: 4000 }),

  changedBy: uuid("changed_by"),

  changeDate: timestamp("change_date", { withTimezone: true })
    .defaultNow()
    .notNull(),

  metadata: jsonb("metadata"),
});
