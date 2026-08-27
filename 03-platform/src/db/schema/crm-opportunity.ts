/**
 * Purpose:
 * CRM opportunity master record — sales pipeline deal tracking.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
 */

import {
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { branch } from "./branch";
import { business } from "./business";
import { crmAccount } from "./crm-account";
import { crmLead } from "./crm-lead";
import { crmRecord } from "./crm-record";
import { opportunityPipeline } from "./opportunity-pipeline";
import { party } from "./party";

export const crmOpportunity = pgTable(
  "crm_opportunity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    crmRecordId: uuid("crm_record_id")
      .references(() => crmRecord.id)
      .notNull(),
    partyId: uuid("party_id")
      .references(() => party.id)
      .notNull(),
    accountId: uuid("account_id").references(() => crmAccount.id),
    sourceLeadId: uuid("source_lead_id").references(() => crmLead.id),
    primaryContactPartyId: uuid("primary_contact_party_id").references(
      () => party.id
    ),
    opportunityNumber: varchar("opportunity_number", { length: 40 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    pipelineId: uuid("pipeline_id")
      .references(() => opportunityPipeline.id)
      .notNull(),
    stageCode: varchar("stage_code", { length: 50 }).notNull(),
    statusCode: varchar("status_code", { length: 50 }).notNull(),
    ownerPartyId: uuid("owner_party_id").references(() => party.id),
    branchId: uuid("branch_id").references(() => branch.id),
    expectedCloseDate: date("expected_close_date"),
    amount: numeric("amount", { precision: 20, scale: 2 }),
    currencyCode: varchar("currency_code", { length: 3 }),
    probability: integer("probability").default(0).notNull(),
    weightedAmount: numeric("weighted_amount", { precision: 20, scale: 2 }),
    lossReasonCode: varchar("loss_reason_code", { length: 50 }),
    competitorCode: varchar("competitor_code", { length: 50 }),
    closeNotes: varchar("close_notes", { length: 2000 }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
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
  },
  (table) => [
    uniqueIndex("crm_opportunity_business_number_uidx").on(
      table.businessId,
      table.opportunityNumber
    ),
  ]
);
