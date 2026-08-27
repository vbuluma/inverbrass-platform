/**
 * Purpose:
 * Business-scoped commercial governance policy (approval, SoD, thresholds).
 * Not a pricing/tax master — configuration for IP-08 control only.
 *
 * Implementation Package:
 * BP-005 / IP-08 – Commercial Governance
 */

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

export const commercialGovernancePolicy = pgTable(
  "commercial_governance_policy",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    /** When true, material changes require approval before activation. */
    approvalRequired: boolean("approval_required").default(true).notNull(),

    /** Maker cannot approve their own material change. */
    requiresSegregationOfDuties: boolean("requires_segregation_of_duties")
      .default(true)
      .notNull(),

    /** Minimum number of approvers (stub for future multi-approver). */
    requiredApproverCount: integer("required_approver_count")
      .default(1)
      .notNull(),

    /**
     * Monetary threshold above which enhanced approval is required.
     * Stored as decimal string; evaluated with CommercialMoney scaled math.
     */
    approvalThresholdAmount: numeric("approval_threshold_amount", {
      precision: 18,
      scale: 6,
    }),

    approvalThresholdCurrency: varchar("approval_threshold_currency", {
      length: 3,
    }),

    allowOverride: boolean("allow_override").default(false).notNull(),

    overrideRequiresApproval: boolean("override_requires_approval")
      .default(true)
      .notNull(),

    mandatoryJustification: boolean("mandatory_justification")
      .default(true)
      .notNull(),

    /** JSON array of field paths considered material when changed. */
    materialFieldPaths: jsonb("material_field_paths").$type<string[]>(),

    isActive: boolean("is_active").default(true).notNull(),

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
    uniqueIndex("commercial_governance_policy_business_uidx").on(
      table.businessId
    ),
  ]
);
