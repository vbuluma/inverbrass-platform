/**
 * Purpose:
 * BP-009 IP-06 purchase order header, versions, lines, payment terms, supplier tokens.
 * Does not post inventory, receipts, invoices, or GL entries.
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
import { sql } from "drizzle-orm";

import { business } from "./business";
import { procurementProfile } from "./procurement-profile";
import {
  procurementPurchaseRequest,
  procurementPurchaseRequestLine,
} from "./procurement-purchase-request";
import { procurementContract, procurementContractVersion } from "./procurement-contract";
import {
  procurementAward,
  procurementAwardLine,
  procurementSourcingEvent,
  procurementSupplierQuote,
  procurementSupplierQuoteLine,
} from "./procurement-sourcing";

export const procurementPoControl = pgTable(
  "procurement_po_control",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    requiresApproval: boolean("requires_approval").default(true).notNull(),
    skipRfxEnabled: boolean("skip_rfx_enabled").default(false).notNull(),
    skipRfxMaxAmount: numeric("skip_rfx_max_amount", { precision: 20, scale: 6 }),
    materialAmendmentThreshold: numeric("material_amendment_threshold", {
      precision: 20,
      scale: 6,
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("procurement_po_control_business_uidx").on(table.businessId)]
);

export const procurementPurchaseOrder = pgTable(
  "procurement_purchase_order",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    poNumber: varchar("po_number", { length: 40 }).notNull(),
    profileId: uuid("profile_id")
      .references(() => procurementProfile.id)
      .notNull(),
    sourceType: varchar("source_type", { length: 30 }).notNull(),
    purchaseRequestId: uuid("purchase_request_id").references(() => procurementPurchaseRequest.id),
    sourcingEventId: uuid("sourcing_event_id").references(() => procurementSourcingEvent.id),
    awardId: uuid("award_id").references(() => procurementAward.id),
    contractId: uuid("contract_id").references(() => procurementContract.id),
    contractVersionId: uuid("contract_version_id").references(() => procurementContractVersion.id),
    callOffReference: varchar("call_off_reference", { length: 80 }),
    winningQuoteId: uuid("winning_quote_id").references(() => procurementSupplierQuote.id),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    status: varchar("status", { length: 30 }).default("DRAFT").notNull(),
    currentVersionId: uuid("current_version_id"),
    acceptedVersionId: uuid("accepted_version_id"),
    subtotalAmount: numeric("subtotal_amount", { precision: 20, scale: 6 }).default("0").notNull(),
    taxAmount: numeric("tax_amount", { precision: 20, scale: 6 }).default("0").notNull(),
    totalAmount: numeric("total_amount", { precision: 20, scale: 6 }).default("0").notNull(),
    year1Amount: numeric("year1_amount", { precision: 20, scale: 6 }),
    tcvAmount: numeric("tcv_amount", { precision: 20, scale: 6 }),
    tcoAmount: numeric("tco_amount", { precision: 20, scale: 6 }),
    deliveryLocation: varchar("delivery_location", { length: 500 }),
    warrantyNotes: varchar("warranty_notes", { length: 2000 }),
    termsAndConditions: varchar("terms_and_conditions", { length: 4000 }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedBy: uuid("submitted_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    issuedBy: uuid("issued_by"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: uuid("cancelled_by"),
    cancellationReason: varchar("cancellation_reason", { length: 2000 }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by"),
    closureReason: varchar("closure_reason", { length: 2000 }),
    issueIdempotencyKey: varchar("issue_idempotency_key", { length: 160 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid("updated_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("procurement_po_business_number_uidx").on(table.businessId, table.poNumber),
    uniqueIndex("procurement_po_issue_idempotency_uidx")
      .on(table.businessId, table.issueIdempotencyKey)
      .where(sql`${table.issueIdempotencyKey} IS NOT NULL`),
    index("procurement_po_business_status_idx").on(table.businessId, table.status),
  ]
);

export const procurementPurchaseOrderVersion = pgTable(
  "procurement_purchase_order_version",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    purchaseOrderId: uuid("purchase_order_id")
      .references(() => procurementPurchaseOrder.id)
      .notNull(),
    versionNumber: integer("version_number").notNull(),
    status: varchar("status", { length: 30 }).default("DRAFT").notNull(),
    subtotalAmount: numeric("subtotal_amount", { precision: 20, scale: 6 }).default("0").notNull(),
    taxAmount: numeric("tax_amount", { precision: 20, scale: 6 }).default("0").notNull(),
    totalAmount: numeric("total_amount", { precision: 20, scale: 6 }).default("0").notNull(),
    year1Amount: numeric("year1_amount", { precision: 20, scale: 6 }),
    tcvAmount: numeric("tcv_amount", { precision: 20, scale: 6 }),
    tcoAmount: numeric("tco_amount", { precision: 20, scale: 6 }),
    promisedDeliveryDate: date("promised_delivery_date"),
    warrantyNotes: varchar("warranty_notes", { length: 2000 }),
    termsAndConditions: varchar("terms_and_conditions", { length: 4000 }),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    issuedBy: uuid("issued_by"),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by"),
  },
  (table) => [
    uniqueIndex("procurement_po_version_uidx").on(
      table.purchaseOrderId,
      table.versionNumber
    ),
  ]
);

export const procurementPurchaseOrderLine = pgTable(
  "procurement_purchase_order_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    versionId: uuid("version_id")
      .references(() => procurementPurchaseOrderVersion.id)
      .notNull(),
    awardLineId: uuid("award_line_id").references(() => procurementAwardLine.id),
    quoteLineId: uuid("quote_line_id").references(() => procurementSupplierQuoteLine.id),
    purchaseRequestLineId: uuid("purchase_request_line_id").references(
      () => procurementPurchaseRequestLine.id
    ),
    catalogueItemId: uuid("catalogue_item_id"),
    sequence: integer("sequence").notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),
    uom: varchar("uom", { length: 40 }).default("EA").notNull(),
    unitPrice: numeric("unit_price", { precision: 20, scale: 6 }).notNull(),
    taxRate: numeric("tax_rate", { precision: 8, scale: 4 }).default("0").notNull(),
    lineSubtotal: numeric("line_subtotal", { precision: 20, scale: 6 }).notNull(),
    lineTax: numeric("line_tax", { precision: 20, scale: 6 }).default("0").notNull(),
    lineTotal: numeric("line_total", { precision: 20, scale: 6 }).notNull(),
    promisedDeliveryDate: date("promised_delivery_date"),
    deliveryLocation: varchar("delivery_location", { length: 500 }),
    comments: varchar("comments", { length: 2000 }),
    lineType: varchar("line_type", { length: 30 }).default("INVENTORY").notNull(),
  },
  (table) => [index("procurement_po_line_version_idx").on(table.versionId, table.sequence)]
);

export const procurementPurchaseOrderPaymentTerm = pgTable(
  "procurement_purchase_order_payment_term",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    versionId: uuid("version_id")
      .references(() => procurementPurchaseOrderVersion.id)
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
    index("procurement_po_payment_term_version_idx").on(table.versionId, table.sequence),
  ]
);

export const procurementPoSupplierToken = pgTable(
  "procurement_po_supplier_token",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    purchaseOrderId: uuid("purchase_order_id")
      .references(() => procurementPurchaseOrder.id)
      .notNull(),
    versionId: uuid("version_id")
      .references(() => procurementPurchaseOrderVersion.id)
      .notNull(),
    profileId: uuid("profile_id")
      .references(() => procurementProfile.id)
      .notNull(),
    accessToken: varchar("access_token", { length: 80 }).notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("procurement_po_supplier_token_uidx").on(table.accessToken)]
);

export const procurementPoSupplierResponse = pgTable(
  "procurement_po_supplier_response",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    purchaseOrderId: uuid("purchase_order_id")
      .references(() => procurementPurchaseOrder.id)
      .notNull(),
    versionId: uuid("version_id")
      .references(() => procurementPurchaseOrderVersion.id)
      .notNull(),
    profileId: uuid("profile_id")
      .references(() => procurementProfile.id)
      .notNull(),
    actionType: varchar("action_type", { length: 30 }).notNull(),
    reason: varchar("reason", { length: 2000 }),
    idempotencyKey: varchar("idempotency_key", { length: 160 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("procurement_po_supplier_response_idempotency_uidx")
      .on(table.businessId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
  ]
);
