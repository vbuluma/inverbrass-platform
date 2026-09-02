/**
 * Purpose:
 * BP-009 IP-11 supplier performance measures, scorecards, and governance proposals.
 * Does not create a second supplier master — profiles remain on procurement_profile.
 */

import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { procurementProfile } from "./procurement-profile";

export const procurementPerformanceControl = pgTable(
  "procurement_performance_control",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    defaultPeriodDays: integer("default_period_days").default(90).notNull(),
    preferredScoreThreshold: numeric("preferred_score_threshold", {
      precision: 8,
      scale: 2,
    })
      .default("75")
      .notNull(),
    preferredRequiresApproval: boolean("preferred_requires_approval").default(true).notNull(),
    blockBlacklistedTransactions: boolean("block_blacklisted_transactions")
      .default(true)
      .notNull(),
    supplierSelfEvalRequired: boolean("supplier_self_eval_required").default(true).notNull(),
    includeSupplierSelfEvalInAverage: boolean("include_supplier_self_eval_in_average")
      .default(false)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("procurement_performance_control_business_uidx").on(table.businessId),
  ]
);

export const procurementPerformanceMeasure = pgTable(
  "procurement_performance_measure",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    code: varchar("code", { length: 60 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: varchar("description", { length: 500 }),
    dimension: varchar("dimension", { length: 60 }).notNull(),
    weight: numeric("weight", { precision: 8, scale: 2 }).default("1").notNull(),
    higherIsBetter: boolean("higher_is_better").default(true).notNull(),
    displayOrder: integer("display_order").default(100).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("procurement_performance_measure_business_code_uidx").on(
      table.businessId,
      table.code
    ),
  ]
);

export const procurementPerformanceEvent = pgTable(
  "procurement_performance_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    profileId: uuid("profile_id")
      .references(() => procurementProfile.id)
      .notNull(),
    measureCode: varchar("measure_code", { length: 60 }).notNull(),
    sourceType: varchar("source_type", { length: 40 }).notNull(),
    sourceId: varchar("source_id", { length: 64 }).notNull(),
    sourceKey: varchar("source_key", { length: 200 }).notNull(),
    eventCount: integer("event_count").default(1).notNull(),
    eventValue: numeric("event_value", { precision: 14, scale: 4 }).default("1").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("procurement_performance_event_source_key_uidx").on(
      table.businessId,
      table.sourceKey
    ),
    uniqueIndex("procurement_performance_event_profile_measure_idx").on(
      table.businessId,
      table.profileId,
      table.measureCode,
      table.occurredAt
    ),
  ]
);

export const procurementSupplierScorecard = pgTable(
  "procurement_supplier_scorecard",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    profileId: uuid("profile_id")
      .references(() => procurementProfile.id)
      .notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    compositeScore: numeric("composite_score", { precision: 8, scale: 2 }).notNull(),
    status: varchar("status", { length: 40 }).default("PUBLISHED").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("procurement_supplier_scorecard_period_uidx").on(
      table.businessId,
      table.profileId,
      table.periodStart,
      table.periodEnd
    ),
  ]
);

export const procurementScorecardMeasure = pgTable(
  "procurement_scorecard_measure",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    scorecardId: uuid("scorecard_id")
      .references(() => procurementSupplierScorecard.id)
      .notNull(),
    measureCode: varchar("measure_code", { length: 60 }).notNull(),
    eventCount: integer("event_count").default(0).notNull(),
    eventTotal: numeric("event_total", { precision: 14, scale: 4 }).default("0").notNull(),
    score: numeric("score", { precision: 8, scale: 2 }).notNull(),
    weight: numeric("weight", { precision: 8, scale: 2 }).notNull(),
    weightedScore: numeric("weighted_score", { precision: 10, scale: 4 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("procurement_scorecard_measure_uidx").on(
      table.scorecardId,
      table.measureCode
    ),
  ]
);

export const procurementPerformanceEvaluation = pgTable(
  "procurement_performance_evaluation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    profileId: uuid("profile_id")
      .references(() => procurementProfile.id)
      .notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    evaluatorType: varchar("evaluator_type", { length: 20 }).notNull(),
    evaluatorUserId: uuid("evaluator_user_id"),
    evaluatorLabel: varchar("evaluator_label", { length: 200 }),
    status: varchar("status", { length: 20 }).default("DRAFT").notNull(),
    compositeScore: numeric("composite_score", { precision: 8, scale: 2 }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("procurement_performance_eval_internal_uidx").on(
      table.businessId,
      table.profileId,
      table.periodStart,
      table.periodEnd,
      table.evaluatorType,
      table.evaluatorUserId
    ),
    uniqueIndex("procurement_performance_eval_supplier_uidx")
      .on(table.businessId, table.profileId, table.periodStart, table.periodEnd, table.evaluatorType)
      .where(sql`${table.evaluatorType} = 'SUPPLIER'`),
  ]
);

export const procurementPerformanceEvaluationRating = pgTable(
  "procurement_performance_evaluation_rating",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    evaluationId: uuid("evaluation_id")
      .references(() => procurementPerformanceEvaluation.id)
      .notNull(),
    measureCode: varchar("measure_code", { length: 60 }).notNull(),
    score: numeric("score", { precision: 8, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("procurement_performance_eval_rating_uidx").on(
      table.evaluationId,
      table.measureCode
    ),
  ]
);

export const procurementGovernanceProposal = pgTable(
  "procurement_governance_proposal",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    profileId: uuid("profile_id")
      .references(() => procurementProfile.id)
      .notNull(),
    proposalType: varchar("proposal_type", { length: 40 }).notNull(),
    status: varchar("status", { length: 40 }).default("PENDING").notNull(),
    reason: text("reason").notNull(),
    authority: varchar("authority", { length: 200 }),
    evidenceDocumentId: varchar("evidence_document_id", { length: 64 }),
    effectiveDate: date("effective_date"),
    reviewDate: date("review_date"),
    scorecardId: uuid("scorecard_id").references(() => procurementSupplierScorecard.id),
    proposedBy: uuid("proposed_by"),
    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("procurement_governance_proposal_profile_pending_uidx")
      .on(table.businessId, table.profileId, table.proposalType)
      .where(sql`${table.status} = 'PENDING'`),
  ]
);
