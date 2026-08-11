/**
 * Purpose:
 * Business-scoped CRM governance master record keyed by party (Customer Profile).
 *
 * Architecture note:
 * IP-01 will later add crm_record_id; v1 uses party_id as the governed subject.
 *
 * Implementation Package:
 * BP-004 / IP-013 – CRM Governance & Administration
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { party } from "./party";

export const crmGovernance = pgTable(
  "crm_governance",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    partyId: uuid("party_id")
      .notNull()
      .references(() => party.id),

    ownerUserId: uuid("owner_user_id"),

    relationshipManagerUserId: uuid("relationship_manager_user_id"),

    stewardUserId: uuid("steward_user_id"),

    governanceStatus: varchar("governance_status", { length: 80 }).notNull(),

    readinessScore: numeric("readiness_score", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),

    lastValidationDate: timestamp("last_validation_date", {
      withTimezone: true,
    }),

    isLocked: boolean("is_locked").default(false).notNull(),

    activationBlocked: boolean("activation_blocked").default(false).notNull(),

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
  },
  (table) => [
    uniqueIndex("crm_governance_business_party_uidx")
      .on(table.businessId, table.partyId)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
