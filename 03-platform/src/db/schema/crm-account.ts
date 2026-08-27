/**
 * Purpose:
 * CRM account master — organisational selling/service context.
 *
 * Design rationale:
 * Account may link to Party (org) and CRM record without duplicating identity.
 * Hierarchy via parent_account_id; circular references prohibited in service.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
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

export const crmAccount = pgTable(
  "crm_account",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    accountNumber: varchar("account_number", { length: 40 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    partyId: uuid("party_id").references(() => party.id),
    crmRecordId: uuid("crm_record_id").references(() => crmRecord.id),
    accountTypeCode: varchar("account_type_code", { length: 50 }).notNull(),
    statusCode: varchar("status_code", { length: 50 }).notNull(),
    parentAccountId: uuid("parent_account_id"),
    ownerPartyId: uuid("owner_party_id").references(() => party.id),
    branchId: uuid("branch_id").references(() => branch.id),
    segmentCode: varchar("segment_code", { length: 50 }),
    classificationTags: jsonb("classification_tags").$type<string[]>(),
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
    uniqueIndex("crm_account_business_number_uidx").on(
      table.businessId,
      table.accountNumber
    ),
    uniqueIndex("crm_account_business_name_uidx").on(table.businessId, table.name),
  ]
);
