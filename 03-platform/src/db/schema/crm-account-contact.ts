/**
 * Purpose:
 * CRM contact role at an account — role context only; identity remains BP-002 Party.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { crmAccount } from "./crm-account";
import { crmOpportunity } from "./crm-opportunity";
import { party } from "./party";

export const crmAccountContact = pgTable(
  "crm_account_contact",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .references(() => crmAccount.id)
      .notNull(),
    contactPartyId: uuid("contact_party_id")
      .references(() => party.id)
      .notNull(),
    roleCode: varchar("role_code", { length: 50 }).notNull(),
    influenceLevel: varchar("influence_level", { length: 50 }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    opportunityId: uuid("opportunity_id").references(() => crmOpportunity.id),
    notes: varchar("notes", { length: 1000 }),
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
    uniqueIndex("crm_account_contact_primary_uidx")
      .on(table.accountId)
      .where(sql`${table.isPrimary} = true AND ${table.deletedAt} IS NULL`),
  ]
);
