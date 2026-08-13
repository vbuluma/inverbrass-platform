/**
 * Purpose:
 * Controlled commercial override requests (IP-08).
 * Not payment/RA overrides — commercial configuration/result overrides only.
 *
 * Implementation Package:
 * BP-005 / IP-08 – Commercial Governance
 */

import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { commercialRuleVersion } from "./commercial-rule-version";

export const commercialOverrideRequest = pgTable(
  "commercial_override_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    ruleVersionId: uuid("rule_version_id").references(
      () => commercialRuleVersion.id
    ),

    /** Optional IP-06 snapshot id reference (value object — not FK). */
    snapshotId: varchar("snapshot_id", { length: 80 }),

    resolutionId: varchar("resolution_id", { length: 80 }),

    status: varchar("status", { length: 40 }).notNull(),

    reason: text("reason").notNull(),

    originalValue: jsonb("original_value").notNull(),

    overriddenValue: jsonb("overridden_value").notNull(),

    applicableRuleKey: varchar("applicable_rule_key", { length: 120 }),

    requestedBy: uuid("requested_by").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),

    rejectedBy: uuid("rejected_by"),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  }
);
