/**
 * CRM Case master — enquiry / complaint / feedback / service request (IP-09).
 */

import {
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { crmCommunication } from "./crm-communication";
import { party } from "./party";

export const crmCase = pgTable(
  "crm_case",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    caseNumber: varchar("case_number", { length: 40 }).notNull(),
    caseTypeCode: varchar("case_type_code", { length: 50 }).notNull(),
    categoryCode: varchar("category_code", { length: 50 }),
    subcategoryCode: varchar("subcategory_code", { length: 50 }),
    subject: varchar("subject", { length: 300 }).notNull(),
    description: varchar("description", { length: 8000 }).notNull(),
    statusCode: varchar("status_code", { length: 50 }).default("NEW").notNull(),
    priorityCode: varchar("priority_code", { length: 50 }).default("NORMAL").notNull(),
    severityCode: varchar("severity_code", { length: 50 }).default("MEDIUM").notNull(),
    channelCode: varchar("channel_code", { length: 50 }),
    ownerUserId: uuid("owner_user_id"),
    queueCode: varchar("queue_code", { length: 50 }),
    primaryPartyId: uuid("primary_party_id")
      .references(() => party.id)
      .notNull(),
    primaryContactPartyId: uuid("primary_contact_party_id").references(() => party.id),
    linkedCommunicationId: uuid("linked_communication_id").references(
      () => crmCommunication.id
    ),
    /** Soft reference to crm_sla_policy (IP-13); no hard FK. */
    slaPolicyId: uuid("sla_policy_id"),
    escalationLevel: integer("escalation_level").default(0).notNull(),
    resolutionSummary: varchar("resolution_summary", { length: 4000 }),
    resolutionCode: varchar("resolution_code", { length: 50 }),
    rootCauseCode: varchar("root_cause_code", { length: 50 }),
    satisfactionRating: integer("satisfaction_rating"),
    satisfactionComment: varchar("satisfaction_comment", { length: 2000 }),
    openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
    firstRespondedAt: timestamp("first_responded_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    slaFirstResponseDueAt: timestamp("sla_first_response_due_at", {
      withTimezone: true,
    }),
    slaResolutionDueAt: timestamp("sla_resolution_due_at", { withTimezone: true }),
    slaBreachedAt: timestamp("sla_breached_at", { withTimezone: true }),
    slaAtRiskAt: timestamp("sla_at_risk_at", { withTimezone: true }),
    slaPausedAt: timestamp("sla_paused_at", { withTimezone: true }),
    slaPauseReasonCode: varchar("sla_pause_reason_code", { length: 50 }),
    reopenReason: varchar("reopen_reason", { length: 2000 }),
    reopenedAt: timestamp("reopened_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid("updated_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("crm_case_business_number_uidx").on(table.businessId, table.caseNumber),
  ]
);
