/**
 * Purpose:
 * Versioned commercial rule/configuration under IP-08 governance.
 * Stores governed policy payloads (tax/adjustment/commercial policy) —
 * not a second product/pricing master.
 *
 * Implementation Package:
 * BP-005 / IP-08 – Commercial Governance
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
import { sql } from "drizzle-orm";

import { business } from "./business";

export const commercialRuleVersion = pgTable(
  "commercial_rule_version",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    /** Stable identity across versions (e.g. TAX-VAT-DEFAULT). */
    ruleKey: varchar("rule_key", { length: 120 }).notNull(),

    ruleType: varchar("rule_type", { length: 50 }).notNull(),

    versionNumber: integer("version_number").notNull().default(1),

    lifecycleStatus: varchar("lifecycle_status", { length: 40 }).notNull(),

    label: varchar("label", { length: 200 }).notNull(),

    description: text("description"),

    /** Commercial configuration payload (rates, amounts, applicability). */
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),

    currencyCode: varchar("currency_code", { length: 3 }),

    effectiveFrom: timestamp("effective_from", { withTimezone: true }),

    effectiveTo: timestamp("effective_to", { withTimezone: true }),

    previousVersionId: uuid("previous_version_id"),

    supersededByVersionId: uuid("superseded_by_version_id"),

    approvalRequired: boolean("approval_required").default(true).notNull(),

    submittedBy: uuid("submitted_by"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),

    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),

    rejectedBy: uuid("rejected_by"),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),

    activatedBy: uuid("activated_by"),
    activatedAt: timestamp("activated_at", { withTimezone: true }),

    suspendedBy: uuid("suspended_by"),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspensionReason: text("suspension_reason"),

    retiredBy: uuid("retired_by"),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    retirementReason: text("retirement_reason"),

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

    metadata: jsonb("metadata"),
  },
  (table) => [
    uniqueIndex("commercial_rule_version_business_key_ver_uidx")
      .on(table.businessId, table.ruleKey, table.versionNumber)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
