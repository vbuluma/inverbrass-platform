/**
 * Purpose:
 * Statutory tax obligation derived from IP-03/IP-06 tax liability.
 * Owns compliance lifecycle — does not recalculate tax.
 *
 * Implementation Package:
 * BP-005 / IP-11 – Tax Compliance, Remittance & Evidence Management
 */

import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { taxComplianceRule } from "./tax-compliance-rule";

export const taxObligation = pgTable(
  "tax_obligation",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    countryCode: varchar("country_code", { length: 2 }).notNull(),

    jurisdictionCode: varchar("jurisdiction_code", { length: 40 }).notNull(),

    taxRegimeCode: varchar("tax_regime_code", { length: 50 }),

    taxTypeCode: varchar("tax_type_code", { length: 50 }).notNull(),

    periodKey: varchar("period_key", { length: 40 }).notNull(),

    periodStart: date("period_start"),

    periodEnd: date("period_end"),

    /** IP-06 snapshot id (value object — not FK). */
    snapshotId: varchar("snapshot_id", { length: 80 }),

    resolutionId: varchar("resolution_id", { length: 80 }),

    commercialContractId: uuid("commercial_contract_id"),

    taxComponentId: varchar("tax_component_id", { length: 80 }),

    taxableAmount: numeric("taxable_amount", {
      precision: 18,
      scale: 6,
    }),

    taxAmount: numeric("tax_amount", {
      precision: 18,
      scale: 6,
    }),

    currencyCode: varchar("currency_code", { length: 3 }),

    obligationDate: date("obligation_date"),

    filingDueDate: date("filing_due_date"),

    remittanceDueDate: date("remittance_due_date"),

    filingStatus: varchar("filing_status", { length: 40 }),

    remittanceStatus: varchar("remittance_status", { length: 40 }),

    evidenceStatus: varchar("evidence_status", { length: 40 }),

    complianceStatus: varchar("compliance_status", { length: 40 }),

    ruleVersionId: uuid("rule_version_id").references(
      () => taxComplianceRule.id
    ),

    ruleKey: varchar("rule_key", { length: 120 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    metadata: jsonb("metadata"),

    version: integer("version").default(1).notNull(),
  },
  (table) => [
    index("tax_obligation_business_idx").on(table.businessId),
  ]
);
