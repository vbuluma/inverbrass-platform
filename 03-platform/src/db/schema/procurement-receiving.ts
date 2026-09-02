/**
 * Purpose:
 * BP-009 IP-08 procurement receipt facts and downstream handoff references.
 * Does not maintain inventory on-hand balances.
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

export const procurementReceivingControl = pgTable(
  "procurement_receiving_control",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    overReceiptPolicy: varchar("over_receipt_policy", { length: 30 })
      .default("BLOCK")
      .notNull(),
    requiresSupplierAcceptance: boolean("requires_supplier_acceptance").default(true).notNull(),
    requiresReceiptConfirmation: boolean("requires_receipt_confirmation")
      .default(false)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("procurement_receiving_control_business_uidx").on(table.businessId)]
);

export const procurementReceipt = pgTable(
  "procurement_receipt",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    receiptNumber: varchar("receipt_number", { length: 40 }).notNull(),
    receiptType: varchar("receipt_type", { length: 30 }).notNull(),
    status: varchar("status", { length: 30 }).default("DRAFT").notNull(),
    purchaseOrderId: uuid("purchase_order_id")
      .references(() => procurementPurchaseOrder.id)
      .notNull(),
    purchaseOrderVersionId: uuid("purchase_order_version_id")
      .references(() => procurementPurchaseOrderVersion.id)
      .notNull(),
    profileId: uuid("profile_id")
      .references(() => procurementProfile.id)
      .notNull(),
    receiptDate: date("receipt_date").notNull(),
    receiverUserId: uuid("receiver_user_id"),
    deliveryLocation: varchar("delivery_location", { length: 500 }),
    inspectionStatus: varchar("inspection_status", { length: 30 }).default("NOT_REQUIRED").notNull(),
    inspectionNotes: varchar("inspection_notes", { length: 2000 }),
    inspectedAt: timestamp("inspected_at", { withTimezone: true }),
    inspectedBy: uuid("inspected_by"),
    servicePeriodStart: date("service_period_start"),
    servicePeriodEnd: date("service_period_end"),
    assetCondition: varchar("asset_condition", { length: 80 }),
    comments: varchar("comments", { length: 4000 }),
    evidenceDocumentId: varchar("evidence_document_id", { length: 120 }),
    overDeliveryFlag: boolean("over_delivery_flag").default(false).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedBy: uuid("submitted_by"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    confirmedBy: uuid("confirmed_by"),
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
    uniqueIndex("procurement_receipt_business_number_uidx").on(table.businessId, table.receiptNumber),
    index("procurement_receipt_business_po_idx").on(table.businessId, table.purchaseOrderId),
    index("procurement_receipt_business_status_idx").on(table.businessId, table.status),
  ]
);

export const procurementReceiptLine = pgTable(
  "procurement_receipt_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    receiptId: uuid("receipt_id")
      .references(() => procurementReceipt.id)
      .notNull(),
    poLineId: uuid("po_line_id")
      .references(() => procurementPurchaseOrderLine.id)
      .notNull(),
    lineType: varchar("line_type", { length: 30 }).notNull(),
    sequence: integer("sequence").notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    quantityReceived: numeric("quantity_received", { precision: 20, scale: 6 }).notNull(),
    uom: varchar("uom", { length: 40 }).default("EA").notNull(),
    catalogueItemId: uuid("catalogue_item_id"),
    stockItemId: uuid("stock_item_id"),
    discrepancyType: varchar("discrepancy_type", { length: 40 }),
    discrepancyDescription: varchar("discrepancy_description", { length: 2000 }),
    damageFlag: boolean("damage_flag").default(false).notNull(),
  },
  (table) => [
    index("procurement_receipt_line_receipt_idx").on(table.receiptId, table.sequence),
    index("procurement_receipt_line_po_line_idx").on(table.poLineId),
  ]
);

export const procurementReceiptHandoff = pgTable(
  "procurement_receipt_handoff",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    receiptId: uuid("receipt_id")
      .references(() => procurementReceipt.id)
      .notNull(),
    receiptLineId: uuid("receipt_line_id")
      .references(() => procurementReceiptLine.id)
      .notNull(),
    handoffType: varchar("handoff_type", { length: 30 }).notNull(),
    status: varchar("status", { length: 30 }).default("PENDING").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    downstreamSystem: varchar("downstream_system", { length: 40 }).notNull(),
    downstreamReference: varchar("downstream_reference", { length: 120 }),
    errorMessage: varchar("error_message", { length: 2000 }),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("procurement_receipt_handoff_idempotency_uidx")
      .on(table.businessId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index("procurement_receipt_handoff_receipt_idx").on(table.receiptId),
  ]
);
