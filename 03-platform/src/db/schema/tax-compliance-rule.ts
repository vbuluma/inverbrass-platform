/**
 * Purpose:
 * Tenant-scoped tax compliance rule versions (filing/remittance calendars).
 * Platform Kenya templates are seeded per-business on profile create — not
 * stored as null-business platform rows.
 *
 * Implementation Package:
 * BP-005 / IP-11 – Tax Compliance, Remittance & Evidence Management
 */

import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";

export const taxComplianceRule = pgTable(
  "tax_compliance_rule",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    jurisdictionCode: varchar("jurisdiction_code", { length: 40 }).notNull(),

    countryCode: varchar("country_code", { length: 2 }).notNull(),

    taxTypeCode: varchar("tax_type_code", { length: 50 }).notNull(),

    ruleKey: varchar("rule_key", { length: 120 }).notNull(),

    versionNumber: integer("version_number").notNull().default(1),

    lifecycleStatus: varchar("lifecycle_status", { length: 40 }).notNull(),

    label: varchar("label", { length: 200 }).notNull(),

    description: text("description"),

    filingFrequency: varchar("filing_frequency", { length: 40 }).notNull(),

    remittanceFrequency: varchar("remittance_frequency", {
      length: 40,
    }).notNull(),

    /** e.g. { type: "FIXED_DAY_FOLLOWING_MONTH", day: 20, adjustWeekends: true } */
    dueDateRule: jsonb("due_date_rule").$type<Record<string, unknown>>(),

    requiresRegistration: boolean("requires_registration")
      .default(false)
      .notNull(),

    requiredEvidenceTypes: jsonb("required_evidence_types").$type<string[]>(),

    filingRequired: boolean("filing_required").default(true).notNull(),

    remittanceRequired: boolean("remittance_required").default(true).notNull(),

    effectiveFrom: timestamp("effective_from", { withTimezone: true }),

    effectiveTo: timestamp("effective_to", { withTimezone: true }),

    previousVersionId: uuid("previous_version_id"),

    payload: jsonb("payload").$type<Record<string, unknown>>(),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedBy: uuid("updated_by"),

    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("tax_compliance_rule_business_key_ver_uidx").on(
      table.businessId,
      table.ruleKey,
      table.versionNumber
    ),
  ]
);
