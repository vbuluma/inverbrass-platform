/**
 * Purpose:
 * CRM governance ownership history with effective dating (FR-002).
 *
 * Implementation Package:
 * BP-004 / IP-013 – CRM Governance & Administration
 */

import {
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { crmGovernance } from "./crm-governance";

export const crmGovernanceOwnershipHistory = pgTable(
  "crm_governance_ownership_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    governanceId: uuid("governance_id")
      .notNull()
      .references(() => crmGovernance.id),

    roleCode: varchar("role_code", { length: 40 }).notNull(),

    userId: uuid("user_id").notNull(),

    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),

    effectiveTo: timestamp("effective_to", { withTimezone: true }),

    changedBy: uuid("changed_by"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  }
);
