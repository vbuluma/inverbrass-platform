/**
 * Purpose:
 * Procurement relationship on an existing BP-002 Party. Not a second supplier master.
 *
 * Implementation Package:
 * BP-009 / IP-01 – Procurement Foundation & Supplier Relationship
 */

import {
  boolean,
  date,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { party } from "./party";

export const procurementProfile = pgTable(
  "procurement_profile",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    partyId: uuid("party_id")
      .references(() => party.id)
      .notNull(),

    profileNumber: varchar("profile_number", { length: 40 }).notNull(),

    statusCode: varchar("status_code", { length: 50 }).notNull(),

    qualificationStatusCode: varchar("qualification_status_code", {
      length: 50,
    }).notNull(),

    isPreferred: boolean("is_preferred").default(false).notNull(),

    isApproved: boolean("is_approved").default(false).notNull(),

    defaultDeliveryTerms: varchar("default_delivery_terms", { length: 200 }),

    defaultPaymentTerms: varchar("default_payment_terms", { length: 200 }),

    expectedLeadTimeDays: integer("expected_lead_time_days"),

    statusReason: varchar("status_reason", { length: 2000 }),

    statusEffectiveDate: date("status_effective_date"),

    statusReviewDate: date("status_review_date"),

    statusAuthority: varchar("status_authority", { length: 200 }),

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
    uniqueIndex("procurement_profile_business_party_uidx")
      .on(table.businessId, table.partyId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("procurement_profile_business_number_uidx").on(
      table.businessId,
      table.profileNumber
    ),
  ]
);

export const procurementProfileCategory = pgTable(
  "procurement_profile_category",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    profileId: uuid("profile_id")
      .references(() => procurementProfile.id)
      .notNull(),

    categoryCode: varchar("category_code", { length: 50 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),
  },
  (table) => [
    uniqueIndex("procurement_profile_category_uidx").on(
      table.profileId,
      table.categoryCode
    ),
  ]
);

export const procurementProfileCapability = pgTable(
  "procurement_profile_capability",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    profileId: uuid("profile_id")
      .references(() => procurementProfile.id)
      .notNull(),

    capabilityCode: varchar("capability_code", { length: 50 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),
  },
  (table) => [
    uniqueIndex("procurement_profile_capability_uidx").on(
      table.profileId,
      table.capabilityCode
    ),
  ]
);
