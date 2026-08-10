/**
 * Purpose:
 * Campaign and campaign member persistence for BP-004 CRM.
 *
 * Design rationale:
 * Audience targets BP-002 party groups. Lead/opportunity IDs are UUID
 * columns without FK until CRM Core merges.
 *
 * Implementation Package:
 * BP-004 / IP-11 – Campaign Management (Phase 11.1)
 */

import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { currency } from "./currency";
import { party } from "./party";
import { partyGroup } from "./party-group";

export const campaign = pgTable("campaign", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),

  campaignNumber: varchar("campaign_number", { length: 80 }).notNull(),

  name: varchar("name", { length: 200 }).notNull(),

  campaignType: varchar("campaign_type", { length: 50 }).notNull(),

  status: varchar("status", { length: 50 }).notNull(),

  startAt: timestamp("start_at", { withTimezone: true }),

  endAt: timestamp("end_at", { withTimezone: true }),

  budgetAmount: numeric("budget_amount", { precision: 20, scale: 6 })
    .default("0")
    .notNull(),

  actualCost: numeric("actual_cost", { precision: 20, scale: 6 })
    .default("0")
    .notNull(),

  currencyCode: varchar("currency_code", { length: 3 })
    .notNull()
    .references(() => currency.code),

  objective: varchar("objective", { length: 2000 }),

  ownerUserId: uuid("owner_user_id"),

  partyGroupId: uuid("party_group_id").references(() => partyGroup.id),

  expectedResponseCount: integer("expected_response_count").default(0).notNull(),

  notes: varchar("notes", { length: 4000 }),

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
});

export const campaignMember = pgTable("campaign_member", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),

  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaign.id),

  partyId: uuid("party_id")
    .notNull()
    .references(() => party.id),

  memberStatus: varchar("member_status", { length: 50 }).notNull(),

  /** Lead — FK added when IP-02 schema merges */
  leadId: uuid("lead_id"),

  /** Opportunity — FK added when IP-03 schema merges */
  opportunityId: uuid("opportunity_id"),

  consentCheckedAt: timestamp("consent_checked_at", { withTimezone: true }),

  consentGranted: boolean("consent_granted").default(false).notNull(),

  outreachChannel: varchar("outreach_channel", { length: 50 }),

  respondedAt: timestamp("responded_at", { withTimezone: true }),

  convertedAt: timestamp("converted_at", { withTimezone: true }),

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
});
