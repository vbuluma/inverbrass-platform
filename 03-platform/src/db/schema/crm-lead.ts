/**
 * Purpose:
 * CRM lead entity — sales pipeline before full customer conversion.
 *
 * Design rationale:
 * Leads share the same Party ID through conversion; CRM record is linked on convert.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

import {
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { branch } from "./branch";
import { business } from "./business";
import { crmRecord } from "./crm-record";
import { party } from "./party";

export const crmLead = pgTable(
  "crm_lead",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    partyId: uuid("party_id")
      .references(() => party.id)
      .notNull(),
    leadNumber: varchar("lead_number", { length: 40 }).notNull(),
    statusCode: varchar("status_code", { length: 50 }).notNull(),
    sourceCode: varchar("source_code", { length: 50 }).notNull(),
    channelCode: varchar("channel_code", { length: 50 }),
    ownerPartyId: uuid("owner_party_id").references(() => party.id),
    branchId: uuid("branch_id").references(() => branch.id),
    companyName: varchar("company_name", { length: 200 }),
    contactName: varchar("contact_name", { length: 200 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    qualificationScore: integer("qualification_score"),
    convertedCrmId: uuid("converted_crm_id").references(() => crmRecord.id),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    disqualificationReasonCode: varchar("disqualification_reason_code", {
      length: 50,
    }),
    notes: varchar("notes", { length: 2000 }),
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
    uniqueIndex("crm_lead_business_number_uidx").on(
      table.businessId,
      table.leadNumber
    ),
  ]
);
