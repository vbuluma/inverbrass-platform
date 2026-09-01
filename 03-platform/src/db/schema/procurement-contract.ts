/**
 * Purpose:
 * BP-009 IP-07 contract header, versions, period values, and payment terms.
 * Does not post inventory, GL, invoices, or payments.
 */

import {
  boolean,
  date,
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
import {
  procurementAward,
  procurementSourcingEvent,
  procurementSupplierQuote,
} from "./procurement-sourcing";

export const procurementContractControl = pgTable(
  "procurement_contract_control",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    requiresApproval: boolean("requires_approval").default(true).notNull(),
    requiresExecutionEvidence: boolean("requires_execution_evidence")
      .default(true)
      .notNull(),
    materialAmendmentThreshold: numeric("material_amendment_threshold", {
      precision: 20,
      scale: 6,
    }),
    expiryWarningDays: integer("expiry_warning_days").default(90).notNull(),
    directContractFromPrEnabled: boolean("direct_contract_from_pr_enabled")
      .default(false)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("procurement_contract_control_business_uidx").on(table.businessId)]
);

export const procurementContract = pgTable(
  "procurement_contract",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    contractNumber: varchar("contract_number", { length: 40 }).notNull(),
    profileId: uuid("profile_id")
      .references(() => procurementProfile.id)
      .notNull(),
    contractTypeCode: varchar("contract_type_code", { length: 50 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: varchar("description", { length: 4000 }),
    status: varchar("status", { length: 30 }).default("DRAFT").notNull(),
    sourceType: varchar("source_type", { length: 30 }).notNull(),
    purchaseRequestId: uuid("purchase_request_id").references(
      () => procurementPurchaseRequest.id
    ),
    sourcingEventId: uuid("sourcing_event_id").references(() => procurementSourcingEvent.id),
    awardId: uuid("award_id").references(() => procurementAward.id),
    winningQuoteId: uuid("winning_quote_id").references(() => procurementSupplierQuote.id),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    valueType: varchar("value_type", { length: 20 }).default("FIXED").notNull(),
    totalValue: numeric("total_value", { precision: 20, scale: 6 }),
    annualValue: numeric("annual_value", { precision: 20, scale: 6 }),
    callOffCeiling: numeric("call_off_ceiling", { precision: 20, scale: 6 }),
    categoryCode: varchar("category_code", { length: 50 }),
    ownerUserId: uuid("owner_user_id"),
    ownerName: varchar("owner_name", { length: 200 }),
    currentVersionId: uuid("current_version_id"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    executionDate: date("execution_date"),
    renewalOption: boolean("renewal_option").default(false).notNull(),
    noticePeriodDays: integer("notice_period_days"),
    callOffsPermitted: boolean("call_offs_permitted").default(true).notNull(),
    executionEvidenceDocumentId: uuid("execution_evidence_document_id"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedBy: uuid("submitted_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by"),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: uuid("rejected_by"),
    rejectionReason: varchar("rejection_reason", { length: 2000 }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    activatedBy: uuid("activated_by"),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedBy: uuid("suspended_by"),
    suspensionReason: varchar("suspension_reason", { length: 2000 }),
    terminatedAt: timestamp("terminated_at", { withTimezone: true }),
    terminatedBy: uuid("terminated_by"),
    terminationReason: varchar("termination_reason", { length: 2000 }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by"),
    closureReason: varchar("closure_reason", { length: 2000 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid("updated_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("procurement_contract_business_number_uidx").on(
      table.businessId,
      table.contractNumber
    ),
    index("procurement_contract_business_status_idx").on(table.businessId, table.status),
    index("procurement_contract_profile_idx").on(table.businessId, table.profileId),
  ]
);

export const procurementContractVersion = pgTable(
  "procurement_contract_version",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    contractId: uuid("contract_id")
      .references(() => procurementContract.id)
      .notNull(),
    versionNumber: integer("version_number").notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    changeReason: varchar("change_reason", { length: 2000 }),
    effectiveDate: date("effective_date"),
    valueType: varchar("value_type", { length: 20 }).notNull(),
    totalValue: numeric("total_value", { precision: 20, scale: 6 }),
    annualValue: numeric("annual_value", { precision: 20, scale: 6 }),
    callOffCeiling: numeric("call_off_ceiling", { precision: 20, scale: 6 }),
    startDate: date("start_date"),
    endDate: date("end_date"),
    renewalOption: boolean("renewal_option").default(false).notNull(),
    noticePeriodDays: integer("notice_period_days"),
    callOffsPermitted: boolean("call_offs_permitted").default(true).notNull(),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by"),
  },
  (table) => [
    uniqueIndex("procurement_contract_version_uidx").on(
      table.contractId,
      table.versionNumber
    ),
  ]
);

export const procurementContractPeriodValue = pgTable(
  "procurement_contract_period_value",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    versionId: uuid("version_id")
      .references(() => procurementContractVersion.id)
      .notNull(),
    periodYear: integer("period_year").notNull(),
    sequence: integer("sequence").notNull(),
    amount: numeric("amount", { precision: 20, scale: 6 }).notNull(),
    description: varchar("description", { length: 500 }),
  },
  (table) => [
    index("procurement_contract_period_value_version_idx").on(
      table.versionId,
      table.sequence
    ),
  ]
);

export const procurementContractPaymentTerm = pgTable(
  "procurement_contract_payment_term",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    versionId: uuid("version_id")
      .references(() => procurementContractVersion.id)
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
    index("procurement_contract_payment_term_version_idx").on(
      table.versionId,
      table.sequence
    ),
  ]
);
