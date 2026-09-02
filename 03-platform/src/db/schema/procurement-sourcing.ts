/**
 * Purpose:
 * IP-03 sourcing event, quote versions, and awards. Not a purchase order.
 * Initial quote is preserved as version 1; later versions are revisions.
 *
 * Implementation Package:
 * BP-009 / IP-03 – Sourcing & RFX Management
 */

import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { procurementProfile } from "./procurement-profile";
import { procurementPurchaseRequest } from "./procurement-purchase-request";

export const procurementSourcingEvent = pgTable(
  "procurement_sourcing_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    eventNumber: varchar("event_number", { length: 40 }).notNull(),
    rfxType: varchar("rfx_type", { length: 20 }).default("RFQ").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    status: varchar("status", { length: 30 }).default("ISSUED").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    recommendation: varchar("recommendation", { length: 4000 }),
    closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
    originalClosesAt: timestamp("original_closes_at", { withTimezone: true }).notNull(),
    riskLevel: varchar("risk_level", { length: 20 }).default("LOW").notNull(),
    categoryCode: varchar("category_code", { length: 50 }),
    openingPolicy: varchar("opening_policy", { length: 30 }).default("STANDARD").notNull(),
    openingPolicySource: varchar("opening_policy_source", { length: 40 })
      .default("ORGANISATION_DEFAULT")
      .notNull(),
    evaluationMethod: varchar("evaluation_method", { length: 40 })
      .default("LOWEST_COMPLIANT")
      .notNull(),
    technicalWeight: numeric("technical_weight", { precision: 8, scale: 2 })
      .default("0")
      .notNull(),
    financialWeight: numeric("financial_weight", { precision: 8, scale: 2 })
      .default("100")
      .notNull(),
    financialBasis: varchar("financial_basis", { length: 20 }).default("YEAR_1").notNull(),
    evaluationStage: varchar("evaluation_stage", { length: 40 }).default("BIDDING").notNull(),
    committeeConstitutedAt: timestamp("committee_constituted_at", { withTimezone: true }),
    committeeConstitutedBy: uuid("committee_constituted_by"),
    criteriaLockedAt: timestamp("criteria_locked_at", { withTimezone: true }),
    criteriaLockedBy: uuid("criteria_locked_by"),
    criteriaSnapshotHash: varchar("criteria_snapshot_hash", { length: 64 }),
    criteriaSnapshotJson: varchar("criteria_snapshot_json", { length: 8000 }),
    awardApprovalStatus: varchar("award_approval_status", { length: 30 }),
    awardSubmittedAt: timestamp("award_submitted_at", { withTimezone: true }),
    awardSubmittedBy: uuid("award_submitted_by"),
    awardApprovedAt: timestamp("award_approved_at", { withTimezone: true }),
    awardApprovedBy: uuid("award_approved_by"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    evaluationStartedAt: timestamp("evaluation_started_at", { withTimezone: true }),
    dueDiligenceRequired: boolean("due_diligence_required"),
    dueDiligenceLocationVerified: boolean("due_diligence_location_verified")
      .default(false)
      .notNull(),
    dueDiligenceStaffVerified: boolean("due_diligence_staff_verified").default(false).notNull(),
    dueDiligenceLegalVerified: boolean("due_diligence_legal_verified").default(false).notNull(),
    dueDiligenceOtherNotes: varchar("due_diligence_other_notes", { length: 2000 }),
    dueDiligenceRecordedAt: timestamp("due_diligence_recorded_at", { withTimezone: true }),
    bidsOpenedAt: timestamp("bids_opened_at", { withTimezone: true }),
    bidsOpenedBy: uuid("bids_opened_by"),
    bidsOpeningApprovedBy: uuid("bids_opening_approved_by"),
    recommendedProfileIds: varchar("recommended_profile_ids", { length: 500 }),
    awardOverrideReason: varchar("award_override_reason", { length: 2000 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid("updated_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("procurement_sourcing_event_number_uidx").on(
      table.businessId,
      table.eventNumber
    ),
    index("procurement_sourcing_event_business_status_idx").on(
      table.businessId,
      table.status
    ),
  ]
);

export const procurementSourcingEventPr = pgTable(
  "procurement_sourcing_event_pr",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    eventId: uuid("event_id")
      .references(() => procurementSourcingEvent.id)
      .notNull(),
    purchaseRequestId: uuid("purchase_request_id")
      .references(() => procurementPurchaseRequest.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("procurement_sourcing_event_pr_uidx").on(
      table.eventId,
      table.purchaseRequestId
    ),
  ]
);

export const procurementSourcingInvitation = pgTable(
  "procurement_sourcing_invitation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    eventId: uuid("event_id")
      .references(() => procurementSourcingEvent.id)
      .notNull(),
    profileId: uuid("profile_id")
      .references(() => procurementProfile.id)
      .notNull(),
    accessToken: varchar("access_token", { length: 80 }).notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    responseStatus: varchar("response_status", { length: 30 }).default("INVITED").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by"),
  },
  (table) => [
    uniqueIndex("procurement_sourcing_invitation_uidx").on(table.eventId, table.profileId),
    uniqueIndex("procurement_sourcing_invitation_token_uidx").on(table.accessToken),
  ]
);

export const procurementSupplierQuote = pgTable(
  "procurement_supplier_quote",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    eventId: uuid("event_id")
      .references(() => procurementSourcingEvent.id)
      .notNull(),
    profileId: uuid("profile_id")
      .references(() => procurementProfile.id)
      .notNull(),
    version: integer("version").notNull(),
    amount: numeric("amount", { precision: 20, scale: 6 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    status: varchar("status", { length: 20 }).default("ACTIVE").notNull(),
    comments: varchar("comments", { length: 4000 }),
    deliveryLeadDays: integer("delivery_lead_days"),
    warrantyNotes: varchar("warranty_notes", { length: 2000 }),
    year1Amount: numeric("year1_amount", { precision: 20, scale: 6 }),
    tcvAmount: numeric("tcv_amount", { precision: 20, scale: 6 }),
    tcoAmount: numeric("tco_amount", { precision: 20, scale: 6 }),
    capturedOnBehalf: boolean("captured_on_behalf").default(false).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 80 }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    submittedBy: uuid("submitted_by"),
  },
  (table) => [
    uniqueIndex("procurement_supplier_quote_version_uidx").on(
      table.eventId,
      table.profileId,
      table.version
    ),
    index("procurement_supplier_quote_event_idx").on(table.businessId, table.eventId),
  ]
);

export const procurementSupplierQuoteLine = pgTable(
  "procurement_supplier_quote_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    quoteId: uuid("quote_id")
      .references(() => procurementSupplierQuote.id)
      .notNull(),
    sequence: integer("sequence").notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 20, scale: 6 }).notNull(),
    taxRate: numeric("tax_rate", { precision: 8, scale: 4 }).default("0").notNull(),
    lineTotal: numeric("line_total", { precision: 20, scale: 6 }).notNull(),
  },
  (table) => [index("procurement_supplier_quote_line_quote_idx").on(table.quoteId, table.sequence)]
);

export const procurementSupplierQuotePaymentTerm = pgTable(
  "procurement_supplier_quote_payment_term",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    quoteId: uuid("quote_id")
      .references(() => procurementSupplierQuote.id)
      .notNull(),
    sequence: integer("sequence").notNull(),
    milestoneName: varchar("milestone_name", { length: 200 }).notNull(),
    percentage: numeric("percentage", { precision: 8, scale: 2 }).notNull(),
    amount: numeric("amount", { precision: 20, scale: 6 }),
    triggerEvent: varchar("trigger_event", { length: 200 }),
    duePeriodDays: integer("due_period_days"),
    comments: varchar("comments", { length: 1000 }),
  },
  (table) => [
    index("procurement_supplier_quote_payment_term_quote_idx").on(table.quoteId, table.sequence),
  ]
);

export const procurementSourcingClarification = pgTable(
  "procurement_sourcing_clarification",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    eventId: uuid("event_id")
      .references(() => procurementSourcingEvent.id)
      .notNull(),
    profileId: uuid("profile_id").references(() => procurementProfile.id),
    question: varchar("question", { length: 4000 }).notNull(),
    answer: varchar("answer", { length: 4000 }),
    askedBy: varchar("asked_by", { length: 120 }),
    answeredBy: uuid("answered_by"),
    isBroadcast: boolean("is_broadcast").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
  },
  (table) => [
    index("procurement_sourcing_clarification_event_idx").on(table.eventId, table.createdAt),
  ]
);

export const procurementAward = pgTable(
  "procurement_award",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    eventId: uuid("event_id")
      .references(() => procurementSourcingEvent.id)
      .notNull(),
    profileId: uuid("profile_id")
      .references(() => procurementProfile.id)
      .notNull(),
    awardedAmount: numeric("awarded_amount", { precision: 20, scale: 6 }).notNull(),
    allocatedBudgetAmount: numeric("allocated_budget_amount", {
      precision: 20,
      scale: 6,
    }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    winningQuoteId: uuid("winning_quote_id").references(() => procurementSupplierQuote.id),
    overrideReason: varchar("override_reason", { length: 2000 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by"),
  },
  (table) => [
    uniqueIndex("procurement_award_event_profile_uidx").on(table.eventId, table.profileId),
    index("procurement_award_event_idx").on(table.businessId, table.eventId),
  ]
);

export const procurementAwardLine = pgTable(
  "procurement_award_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    awardId: uuid("award_id")
      .references(() => procurementAward.id)
      .notNull(),
    winningQuoteId: uuid("winning_quote_id")
      .references(() => procurementSupplierQuote.id)
      .notNull(),
    winningQuoteLineId: uuid("winning_quote_line_id").references(
      () => procurementSupplierQuoteLine.id
    ),
    sequence: integer("sequence").notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),
    uom: varchar("uom", { length: 40 }).default("EA").notNull(),
    unitPrice: numeric("unit_price", { precision: 20, scale: 6 }).notNull(),
    taxRate: numeric("tax_rate", { precision: 8, scale: 4 }).default("0").notNull(),
    lineTotal: numeric("line_total", { precision: 20, scale: 6 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by"),
  },
  (table) => [index("procurement_award_line_award_idx").on(table.awardId, table.sequence)]
);

export const procurementSourcingControl = pgTable(
  "procurement_sourcing_control",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    defaultOpeningPolicy: varchar("default_opening_policy", { length: 30 })
      .default("STANDARD")
      .notNull(),
    extensionRequiresApproval: boolean("extension_requires_approval").default(false).notNull(),
    awardRequiresApproval: boolean("award_requires_approval").default(false).notNull(),
    bidSubmissionCountVisible: boolean("bid_submission_count_visible").default(false).notNull(),
    makerCheckerMinAmount: numeric("maker_checker_min_amount", { precision: 20, scale: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid("updated_by"),
  },
  (table) => [uniqueIndex("procurement_sourcing_control_business_uidx").on(table.businessId)]
);

export const procurementSourcingOpeningRule = pgTable(
  "procurement_sourcing_opening_rule",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    dimension: varchar("dimension", { length: 20 }).notNull(),
    matchValue: varchar("match_value", { length: 80 }).notNull(),
    requiredPolicy: varchar("required_policy", { length: 30 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("procurement_sourcing_opening_rule_business_idx").on(table.businessId, table.dimension),
  ]
);

export const procurementSourcingBidAccessLog = pgTable(
  "procurement_sourcing_bid_access_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    eventId: uuid("event_id")
      .references(() => procurementSourcingEvent.id)
      .notNull(),
    profileId: uuid("profile_id").references(() => procurementProfile.id),
    actorUserId: uuid("actor_user_id"),
    action: varchar("action", { length: 60 }).notNull(),
    accessedAt: timestamp("accessed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("procurement_sourcing_bid_access_log_event_idx").on(table.eventId, table.accessedAt),
  ]
);

export const procurementSourcingEvaluationPhase = pgTable(
  "procurement_sourcing_evaluation_phase",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    eventId: uuid("event_id")
      .references(() => procurementSourcingEvent.id)
      .notNull(),
    phaseCode: varchar("phase_code", { length: 30 }).notNull(),
    included: boolean("included").default(false).notNull(),
    sequence: integer("sequence").notNull(),
    weight: numeric("weight", { precision: 8, scale: 2 }).default("0").notNull(),
    passmark: numeric("passmark", { precision: 8, scale: 2 }).default("0").notNull(),
    required: boolean("required").default(false).notNull(),
  },
  (table) => [
    uniqueIndex("procurement_sourcing_evaluation_phase_uidx").on(table.eventId, table.phaseCode),
  ]
);

export const procurementSourcingEvaluationCommittee = pgTable(
  "procurement_sourcing_evaluation_committee",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    eventId: uuid("event_id")
      .references(() => procurementSourcingEvent.id)
      .notNull(),
    sequence: integer("sequence").notNull(),
    memberName: varchar("member_name", { length: 200 }).notNull(),
    roleLabel: varchar("role_label", { length: 120 }),
    userId: uuid("user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by"),
  },
  (table) => [
    index("procurement_sourcing_evaluation_committee_event_idx").on(table.eventId, table.sequence),
  ]
);

export const procurementSourcingPhaseScore = pgTable(
  "procurement_sourcing_phase_score",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    eventId: uuid("event_id")
      .references(() => procurementSourcingEvent.id)
      .notNull(),
    profileId: uuid("profile_id")
      .references(() => procurementProfile.id)
      .notNull(),
    phaseCode: varchar("phase_code", { length: 30 }).notNull(),
    score: numeric("score", { precision: 8, scale: 2 }).notNull(),
    scoredBy: uuid("scored_by"),
    scoredAt: timestamp("scored_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("procurement_sourcing_phase_score_uidx").on(
      table.eventId,
      table.profileId,
      table.phaseCode
    ),
    index("procurement_sourcing_phase_score_event_idx").on(table.eventId, table.profileId),
  ]
);
