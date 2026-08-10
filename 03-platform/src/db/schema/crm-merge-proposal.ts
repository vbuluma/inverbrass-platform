/**
 * Purpose:
 * Duplicate merge proposal queue (ENG-005 local stub).
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
import { party } from "./party";

export const crmMergeProposal = pgTable("crm_merge_proposal", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),

  survivorPartyId: uuid("survivor_party_id")
    .notNull()
    .references(() => party.id),

  duplicatePartyId: uuid("duplicate_party_id")
    .notNull()
    .references(() => party.id),

  status: varchar("status", { length: 40 }).default("PENDING").notNull(),

  matchReason: varchar("match_reason", { length: 1000 }),

  fieldResolutionJson: jsonb("field_resolution_json"),

  proposedBy: uuid("proposed_by"),

  reviewedBy: uuid("reviewed_by"),

  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),

  executedAt: timestamp("executed_at", { withTimezone: true }),

  notes: varchar("notes", { length: 4000 }),

  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
