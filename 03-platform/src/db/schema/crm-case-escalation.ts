/**
 * Immutable case escalation history — BP-004 / IP-09.
 */

import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { business } from "./business";
import { crmCase } from "./crm-case";

export const crmCaseEscalation = pgTable("crm_case_escalation", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),
  caseId: uuid("case_id")
    .references(() => crmCase.id)
    .notNull(),
  fromOwnerUserId: uuid("from_owner_user_id"),
  toOwnerUserId: uuid("to_owner_user_id"),
  reason: varchar("reason", { length: 2000 }).notNull(),
  triggeredBy: varchar("triggered_by", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by"),
});
