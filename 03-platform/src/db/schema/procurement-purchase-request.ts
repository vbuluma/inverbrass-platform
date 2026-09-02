/**
 * Purpose:
 * Purchase Request header, lines, supporting-document references, and
 * per-business approval/budget-check policy. Not a budget ledger, RFX, or PO.
 *
 * Implementation Package:
 * BP-009 / IP-02 – Purchase Requests & Procurement Approval
 */

import {
  index,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  boolean,
  date,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { procurementProfile } from "./procurement-profile";

export const procurementRequestControl = pgTable(
  "procurement_request_control",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    requiresApproval: boolean("requires_approval").default(true).notNull(),

    overBudgetMode: varchar("over_budget_mode", { length: 40 })
      .default("BLOCK")
      .notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    createdBy: uuid("created_by"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

    updatedBy: uuid("updated_by"),
  },
  (table) => [
    uniqueIndex("procurement_request_control_business_uidx").on(table.businessId),
  ]
);

export const procurementPurchaseRequest = pgTable(
  "procurement_purchase_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    requestNumber: varchar("request_number", { length: 40 }).notNull(),

    status: varchar("status", { length: 30 }).default("DRAFT").notNull(),

    originType: varchar("origin_type", { length: 40 }).notNull(),

    originReference: varchar("origin_reference", { length: 200 }),

    requesterUserId: uuid("requester_user_id"),

    businessUnitCode: varchar("business_unit_code", { length: 100 }),

    procurementType: varchar("procurement_type", { length: 40 }).notNull(),

    justification: varchar("justification", { length: 4000 }),

    requiredDate: date("required_date"),

    deliveryLocation: varchar("delivery_location", { length: 500 }),

    estimatedValue: numeric("estimated_value", { precision: 20, scale: 6 }).notNull(),

    currencyCode: varchar("currency_code", { length: 3 }).notNull(),

    budgetSource: varchar("budget_source", { length: 40 }).notNull(),

    budgetReference: varchar("budget_reference", { length: 200 }),

    budgetLine: varchar("budget_line", { length: 200 }),

    budgetPeriod: varchar("budget_period", { length: 40 }),

    budgetApprovedAmount: numeric("budget_approved_amount", { precision: 20, scale: 6 }),

    budgetAvailableAmount: numeric("budget_available_amount", { precision: 20, scale: 6 }),

    budgetCheckStatus: varchar("budget_check_status", { length: 40 }).notNull(),

    budgetApprovalReference: varchar("budget_approval_reference", { length: 200 }),

    budgetApprovalDate: date("budget_approval_date"),

    budgetApprover: varchar("budget_approver", { length: 200 }),

    suggestedProfileId: uuid("suggested_profile_id").references(() => procurementProfile.id),

    submittedAt: timestamp("submitted_at", { withTimezone: true }),

    submittedBy: uuid("submitted_by"),

    approvedAt: timestamp("approved_at", { withTimezone: true }),

    approvedBy: uuid("approved_by"),

    rejectedAt: timestamp("rejected_at", { withTimezone: true }),

    rejectedBy: uuid("rejected_by"),

    returnedAt: timestamp("returned_at", { withTimezone: true }),

    returnedBy: uuid("returned_by"),

    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    cancelledBy: uuid("cancelled_by"),

    decisionReason: varchar("decision_reason", { length: 2000 }),

    idempotencyKey: varchar("idempotency_key", { length: 160 }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    createdBy: uuid("created_by"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

    updatedBy: uuid("updated_by"),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("procurement_pr_business_number_uidx").on(
      table.businessId,
      table.requestNumber
    ),
    uniqueIndex("procurement_pr_idempotency_uidx")
      .on(table.businessId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index("procurement_pr_business_status_idx").on(table.businessId, table.status),
  ]
);

export const procurementPurchaseRequestLine = pgTable(
  "procurement_purchase_request_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    requestId: uuid("request_id")
      .references(() => procurementPurchaseRequest.id)
      .notNull(),

    lineNumber: integer("line_number").notNull(),

    catalogueItemId: uuid("catalogue_item_id"),

    description: varchar("description", { length: 500 }).notNull(),

    specification: varchar("specification", { length: 4000 }),

    quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),

    uom: varchar("uom", { length: 40 }).notNull(),

    estimatedValue: numeric("estimated_value", { precision: 20, scale: 6 }).notNull(),

    requiredDate: date("required_date"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("procurement_pr_line_request_idx").on(table.businessId, table.requestId),
  ]
);

export const procurementRequestDocument = pgTable(
  "procurement_request_document",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    requestId: uuid("request_id")
      .references(() => procurementPurchaseRequest.id)
      .notNull(),

    documentTypeCode: varchar("document_type_code", { length: 50 }).notNull(),

    originalFileName: varchar("original_file_name", { length: 500 }).notNull(),

    storageReference: varchar("storage_reference", { length: 1000 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    createdBy: uuid("created_by"),
  },
  (table) => [
    index("procurement_pr_document_request_idx").on(table.businessId, table.requestId),
  ]
);
