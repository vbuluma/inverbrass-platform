/**
 * Purpose:
 * BP-009 IP-09 supplier invoices, matching results, and AP handoff references.
 * Does not post GL, execute payment, or increment inventory.
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
  procurementPurchaseOrder,
  procurementPurchaseOrderLine,
  procurementPurchaseOrderVersion,
} from "./procurement-purchase-order";
import { procurementReceipt, procurementReceiptLine } from "./procurement-receiving";

export const procurementInvoiceControl = pgTable(
  "procurement_invoice_control",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    defaultMatchingMode: varchar("default_matching_mode", { length: 30 })
      .default("THREE_WAY")
      .notNull(),
    priceTolerancePercent: numeric("price_tolerance_percent", { precision: 8, scale: 4 })
      .default("2")
      .notNull(),
    quantityTolerancePercent: numeric("quantity_tolerance_percent", { precision: 8, scale: 4 })
      .default("1")
      .notNull(),
    taxToleranceAmount: numeric("tax_tolerance_amount", { precision: 20, scale: 6 })
      .default("0.01")
      .notNull(),
    duplicatePolicy: varchar("duplicate_policy", { length: 30 }).default("BLOCK").notNull(),
    duplicateCheckAmountDate: boolean("duplicate_check_amount_date").default(false).notNull(),
    allowNonPoInvoices: boolean("allow_non_po_invoices").default(false).notNull(),
    requireReceiptForInventory: boolean("require_receipt_for_inventory").default(true).notNull(),
    requireReceiptForAssets: boolean("require_receipt_for_assets").default(true).notNull(),
    requireReceiptForServices: boolean("require_receipt_for_services").default(false).notNull(),
    allowBlacklistedPaymentReady: boolean("allow_blacklisted_payment_ready")
      .default(false)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("procurement_invoice_control_business_uidx").on(table.businessId)]
);

export const procurementSupplierInvoice = pgTable(
  "procurement_supplier_invoice",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    internalInvoiceNumber: varchar("internal_invoice_number", { length: 40 }).notNull(),
    supplierInvoiceNumber: varchar("supplier_invoice_number", { length: 80 }).notNull(),
    profileId: uuid("profile_id")
      .references(() => procurementProfile.id)
      .notNull(),
    partyId: uuid("party_id").notNull(),
    purchaseOrderId: uuid("purchase_order_id").references(() => procurementPurchaseOrder.id),
    purchaseOrderVersionId: uuid("purchase_order_version_id").references(
      () => procurementPurchaseOrderVersion.id
    ),
    invoiceDate: date("invoice_date").notNull(),
    dueDate: date("due_date"),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    subtotalAmount: numeric("subtotal_amount", { precision: 20, scale: 6 }).notNull(),
    taxAmount: numeric("tax_amount", { precision: 20, scale: 6 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 20, scale: 6 }).notNull(),
    taxReference: varchar("tax_reference", { length: 120 }),
    attachmentDocumentId: varchar("attachment_document_id", { length: 120 }),
    status: varchar("status", { length: 30 }).default("DRAFT").notNull(),
    matchOutcome: varchar("match_outcome", { length: 30 }),
    matchingMode: varchar("matching_mode", { length: 30 }),
    duplicateFlag: boolean("duplicate_flag").default(false).notNull(),
    duplicateOfInvoiceId: uuid("duplicate_of_invoice_id"),
    matchVersion: integer("match_version").default(1).notNull(),
    matchIdempotencyKey: varchar("match_idempotency_key", { length: 160 }),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    capturedBy: uuid("captured_by"),
    matchedAt: timestamp("matched_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by"),
    paymentReadyAt: timestamp("payment_ready_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: uuid("rejected_by"),
    rejectionReason: varchar("rejection_reason", { length: 2000 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid("updated_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("procurement_supplier_invoice_business_internal_uidx").on(
      table.businessId,
      table.internalInvoiceNumber
    ),
    index("procurement_supplier_invoice_business_status_idx").on(table.businessId, table.status),
    index("procurement_supplier_invoice_business_po_idx").on(table.businessId, table.purchaseOrderId),
    index("procurement_supplier_invoice_supplier_number_idx").on(
      table.businessId,
      table.profileId,
      table.supplierInvoiceNumber
    ),
  ]
);

export const procurementSupplierInvoiceLine = pgTable(
  "procurement_supplier_invoice_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    invoiceId: uuid("invoice_id")
      .references(() => procurementSupplierInvoice.id)
      .notNull(),
    poLineId: uuid("po_line_id").references(() => procurementPurchaseOrderLine.id),
    sequence: integer("sequence").notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),
    uom: varchar("uom", { length: 40 }).default("EA").notNull(),
    unitPrice: numeric("unit_price", { precision: 20, scale: 6 }).notNull(),
    taxRate: numeric("tax_rate", { precision: 8, scale: 4 }).default("0").notNull(),
    lineSubtotal: numeric("line_subtotal", { precision: 20, scale: 6 }).notNull(),
    lineTax: numeric("line_tax", { precision: 20, scale: 6 }).notNull(),
    lineTotal: numeric("line_total", { precision: 20, scale: 6 }).notNull(),
    taxReference: varchar("tax_reference", { length: 120 }),
  },
  (table) => [
    index("procurement_supplier_invoice_line_invoice_idx").on(table.invoiceId, table.sequence),
    index("procurement_supplier_invoice_line_po_line_idx").on(table.poLineId),
  ]
);

export const procurementInvoiceMatch = pgTable(
  "procurement_invoice_match",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    invoiceId: uuid("invoice_id")
      .references(() => procurementSupplierInvoice.id)
      .notNull(),
    matchingMode: varchar("matching_mode", { length: 30 }).notNull(),
    outcome: varchar("outcome", { length: 30 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    priceVarianceAmount: numeric("price_variance_amount", { precision: 20, scale: 6 })
      .default("0")
      .notNull(),
    quantityVarianceAmount: numeric("quantity_variance_amount", { precision: 20, scale: 6 })
      .default("0")
      .notNull(),
    taxVarianceAmount: numeric("tax_variance_amount", { precision: 20, scale: 6 })
      .default("0")
      .notNull(),
    summary: varchar("summary", { length: 4000 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("procurement_invoice_match_idempotency_uidx")
      .on(table.businessId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index("procurement_invoice_match_invoice_idx").on(table.invoiceId),
  ]
);

export const procurementInvoiceMatchLine = pgTable(
  "procurement_invoice_match_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    matchId: uuid("match_id")
      .references(() => procurementInvoiceMatch.id)
      .notNull(),
    invoiceLineId: uuid("invoice_line_id")
      .references(() => procurementSupplierInvoiceLine.id)
      .notNull(),
    poLineId: uuid("po_line_id").references(() => procurementPurchaseOrderLine.id),
    receiptLineId: uuid("receipt_line_id").references(() => procurementReceiptLine.id),
    poQuantity: numeric("po_quantity", { precision: 20, scale: 6 }),
    receiptQuantity: numeric("receipt_quantity", { precision: 20, scale: 6 }),
    invoiceQuantity: numeric("invoice_quantity", { precision: 20, scale: 6 }).notNull(),
    poAmount: numeric("po_amount", { precision: 20, scale: 6 }),
    invoiceAmount: numeric("invoice_amount", { precision: 20, scale: 6 }).notNull(),
    varianceType: varchar("variance_type", { length: 40 }),
    varianceAmount: numeric("variance_amount", { precision: 20, scale: 6 }),
    withinTolerance: boolean("within_tolerance").default(false).notNull(),
  },
  (table) => [index("procurement_invoice_match_line_match_idx").on(table.matchId)]
);

export const procurementApHandoff = pgTable(
  "procurement_ap_handoff",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    invoiceId: uuid("invoice_id")
      .references(() => procurementSupplierInvoice.id)
      .notNull(),
    status: varchar("status", { length: 30 }).default("PENDING").notNull(),
    payeePartyId: uuid("payee_party_id").notNull(),
    amount: numeric("amount", { precision: 20, scale: 6 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    dueDate: date("due_date"),
    purchaseOrderId: uuid("purchase_order_id").references(() => procurementPurchaseOrder.id),
    supplierInvoiceNumber: varchar("supplier_invoice_number", { length: 80 }).notNull(),
    internalInvoiceNumber: varchar("internal_invoice_number", { length: 40 }).notNull(),
    downstreamSystem: varchar("downstream_system", { length: 40 }).default("AP").notNull(),
    downstreamReference: varchar("downstream_reference", { length: 120 }),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    errorMessage: varchar("error_message", { length: 2000 }),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("procurement_ap_handoff_idempotency_uidx")
      .on(table.businessId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index("procurement_ap_handoff_invoice_idx").on(table.invoiceId),
  ]
);
