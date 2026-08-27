/**
 * Purpose:
 * BP-006 sales/order persistence — operational order header, lines, and
 * consumed BP-005 commercial contract (snapshot is not stored by BP-005).
 *
 * Implementation Package:
 * BP-006 / IP-01 – Sales & Order Creation
 * BP-006 / IP-02 – Order Lifecycle & Fulfilment
 *
 * Design rationale:
 * Evolves the BP-004 IP-10 handoff stub into the BP-006 order owner.
 * Quotation id is optional (direct sale). Commercial amounts are copied from
 * the consumed CommercialTransactionContract — never recalculated here.
 * IP-02 adds completion SoD metadata only; accepted/rejected quantities stay
 * derived from IP-03.
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
import { sql } from "drizzle-orm";

import { business } from "./business";
import { currency } from "./currency";
import { party } from "./party";
import { product } from "./product";
import { quotation } from "./quotation";
import { quotationLine } from "./quotation";
import { quotationVersion } from "./quotation";

export const salesOrder = pgTable(
  "sales_order",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    orderNumber: varchar("order_number", { length: 80 }).notNull(),

    sourceType: varchar("source_type", { length: 30 })
      .default("QUOTATION")
      .notNull(),

    quotationId: uuid("quotation_id").references(() => quotation.id),

    quotationVersionId: uuid("quotation_version_id").references(
      () => quotationVersion.id
    ),

    crmRecordId: uuid("crm_record_id"),

    partyId: uuid("party_id")
      .notNull()
      .references(() => party.id),

    accountId: uuid("account_id"),

    opportunityId: uuid("opportunity_id"),

    status: varchar("status", { length: 50 }).notNull(),

    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currency.code),

    orderDate: timestamp("order_date", { withTimezone: true })
      .defaultNow()
      .notNull(),

    expectedAmount: numeric("expected_amount", { precision: 20, scale: 6 })
      .default("0")
      .notNull(),

    subtotal: numeric("subtotal", { precision: 20, scale: 6 })
      .default("0")
      .notNull(),

    taxAmount: numeric("tax_amount", { precision: 20, scale: 6 })
      .default("0")
      .notNull(),

    grandTotal: numeric("grand_total", { precision: 20, scale: 6 })
      .default("0")
      .notNull(),

    commercialContractId: varchar("commercial_contract_id", { length: 120 }),

    snapshotId: uuid("snapshot_id"),

    confirmationRequiresSod: boolean("confirmation_requires_sod")
      .default(true)
      .notNull(),

    submittedBy: uuid("submitted_by"),

    submittedAt: timestamp("submitted_at", { withTimezone: true }),

    confirmedBy: uuid("confirmed_by"),

    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),

    confirmationRejectedBy: uuid("confirmation_rejected_by"),

    confirmationRejectedAt: timestamp("confirmation_rejected_at", {
      withTimezone: true,
    }),

    confirmationRejectedReason: varchar("confirmation_rejected_reason", {
      length: 1000,
    }),

    completionRequiresSod: boolean("completion_requires_sod")
      .default(true)
      .notNull(),

    completionSubmittedBy: uuid("completion_submitted_by"),

    completionSubmittedAt: timestamp("completion_submitted_at", {
      withTimezone: true,
    }),

    completedBy: uuid("completed_by"),

    completedAt: timestamp("completed_at", { withTimezone: true }),

    completionRejectedBy: uuid("completion_rejected_by"),

    completionRejectedAt: timestamp("completion_rejected_at", {
      withTimezone: true,
    }),

    completionRejectedReason: varchar("completion_rejected_reason", {
      length: 1000,
    }),

    handoffStatus: varchar("handoff_status", { length: 50 })
      .default("PENDING")
      .notNull(),

    paymentStatus: varchar("payment_status", { length: 50 })
      .default("NOT_RECORDED")
      .notNull(),

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
    uniqueIndex("sales_order_business_number_uidx").on(
      table.businessId,
      table.orderNumber
    ),
    uniqueIndex("sales_order_quotation_uidx")
      .on(table.businessId, table.quotationId)
      .where(sql`${table.quotationId} is not null`),
  ]
);

export const salesOrderLine = pgTable("sales_order_line", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),

  salesOrderId: uuid("sales_order_id")
    .notNull()
    .references(() => salesOrder.id),

  lineNumber: integer("line_number").notNull(),

  offeringId: uuid("offering_id")
    .notNull()
    .references(() => product.id),

  offeringVariantId: uuid("offering_variant_id"),

  lineType: varchar("line_type", { length: 30 }).default("SERVICE").notNull(),

  description: varchar("description", { length: 1000 }),

  quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),

  agreedUnitValue: numeric("agreed_unit_value", { precision: 20, scale: 6 })
    .default("0")
    .notNull(),

  commercialLineAmount: numeric("commercial_line_amount", {
    precision: 20,
    scale: 6,
  })
    .default("0")
    .notNull(),

  currencyCode: varchar("currency_code", { length: 3 }).default("KES").notNull(),

  unitPrice: numeric("unit_price", { precision: 20, scale: 6 }).notNull(),

  lineTotal: numeric("line_total", { precision: 20, scale: 6 }).notNull(),

  snapshotId: uuid("snapshot_id"),

  commercialContractId: varchar("commercial_contract_id", { length: 120 }),

  commercialBreakdown: jsonb("commercial_breakdown"),

  quotationLineId: uuid("quotation_line_id").references(() => quotationLine.id),

  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const salesOrderCommercialLink = pgTable(
  "sales_order_commercial_link",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    salesOrderId: uuid("sales_order_id")
      .notNull()
      .references(() => salesOrder.id),

    salesOrderLineId: uuid("sales_order_line_id").references(
      () => salesOrderLine.id
    ),

    snapshotId: uuid("snapshot_id").notNull(),

    commercialContractId: varchar("commercial_contract_id", {
      length: 120,
    }).notNull(),

    expectedAmountId: varchar("expected_amount_id", { length: 160 }),

    expectedPayable: numeric("expected_payable", { precision: 20, scale: 6 })
      .notNull(),

    currencyCode: varchar("currency_code", { length: 3 }).notNull(),

    integrityHash: varchar("integrity_hash", { length: 160 }).notNull(),

    snapshotPayload: jsonb("snapshot_payload").notNull(),

    contractPayload: jsonb("contract_payload").notNull(),

    provenance: jsonb("provenance"),

    consumerRef: varchar("consumer_ref", { length: 200 }),

    consumedAt: timestamp("consumed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),
  },
  (table) => [
    uniqueIndex("sales_order_commercial_link_line_uidx")
      .on(table.salesOrderId, table.salesOrderLineId)
      .where(sql`${table.salesOrderLineId} is not null`),
  ]
);
