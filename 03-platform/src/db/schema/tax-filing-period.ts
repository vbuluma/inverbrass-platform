/**
 * Purpose:
 * Generated filing/remittance periods for a jurisdiction tax type.
 *
 * Implementation Package:
 * BP-005 / IP-11 – Tax Compliance, Remittance & Evidence Management
 */

import {
  date,
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { taxComplianceRule } from "./tax-compliance-rule";

export const taxFilingPeriod = pgTable(
  "tax_filing_period",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    jurisdictionCode: varchar("jurisdiction_code", { length: 40 }).notNull(),

    taxTypeCode: varchar("tax_type_code", { length: 50 }).notNull(),

    /** e.g. 2026-01 */
    periodKey: varchar("period_key", { length: 40 }).notNull(),

    periodStart: date("period_start").notNull(),

    periodEnd: date("period_end").notNull(),

    filingDueDate: date("filing_due_date"),

    remittanceDueDate: date("remittance_due_date"),

    ruleVersionId: uuid("rule_version_id").references(
      () => taxComplianceRule.id
    ),

    status: varchar("status", { length: 40 }).notNull(),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("tax_filing_period_business_idx").on(table.businessId),
  ]
);
