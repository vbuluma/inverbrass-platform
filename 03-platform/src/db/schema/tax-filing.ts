/**
 * Purpose:
 * Tax return / filing records against an obligation.
 *
 * Implementation Package:
 * BP-005 / IP-11 – Tax Compliance, Remittance & Evidence Management
 */

import {
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { taxComplianceRule } from "./tax-compliance-rule";
import { taxObligation } from "./tax-obligation";

export const taxFiling = pgTable(
  "tax_filing",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => taxObligation.id),

    filingReference: varchar("filing_reference", { length: 120 }),

    taxTypeCode: varchar("tax_type_code", { length: 50 }).notNull(),

    periodKey: varchar("period_key", { length: 40 }).notNull(),

    amountDeclared: numeric("amount_declared", {
      precision: 18,
      scale: 6,
    }),

    amountExpected: numeric("amount_expected", {
      precision: 18,
      scale: 6,
    }),

    filingDate: date("filing_date"),

    dueDate: date("due_date"),

    status: varchar("status", { length: 40 }).notNull(),

    authorityCode: varchar("authority_code", { length: 40 }),

    acknowledgementRef: varchar("acknowledgement_ref", { length: 120 }),

    notes: text("notes"),

    ruleVersionId: uuid("rule_version_id").references(
      () => taxComplianceRule.id
    ),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("tax_filing_business_idx").on(table.businessId),
    index("tax_filing_obligation_idx").on(table.obligationId),
  ]
);
