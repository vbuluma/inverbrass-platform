/**
 * Purpose:
 * BP-006 IP-04 amendment versions and return/cancel instructions.
 * Initiation only — does not execute refunds or stock movement.
 *
 * Implementation Package:
 * BP-006 / IP-04 – Amendments, Cancellation & Returns
 */

import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { salesOrder, salesOrderLine } from "./sales-order";

export const salesDispositionInstruction = pgTable("sales_disposition_instruction", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),

  salesOrderId: uuid("sales_order_id")
    .notNull()
    .references(() => salesOrder.id),

  salesOrderLineId: uuid("sales_order_line_id").references(() => salesOrderLine.id),

  instructionType: varchar("instruction_type", { length: 40 }).notNull(),

  status: varchar("status", { length: 30 }).notNull(),

  quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),

  reasonCode: varchar("reason_code", { length: 40 }).notNull(),

  comments: varchar("comments", { length: 2000 }),

  financialInstructionEmitted: boolean("financial_instruction_emitted")
    .default(true)
    .notNull(),

  stockInstructionEmitted: boolean("stock_instruction_emitted")
    .default(false)
    .notNull(),

  refundExecuted: boolean("refund_executed").default(false).notNull(),

  stockMoved: boolean("stock_moved").default(false).notNull(),

  submittedBy: uuid("submitted_by").notNull(),

  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),

  approvedBy: uuid("approved_by"),

  approvedAt: timestamp("approved_at", { withTimezone: true }),

  rejectedBy: uuid("rejected_by"),

  rejectedAt: timestamp("rejected_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  createdBy: uuid("created_by"),
});

export const salesOrderAmendment = pgTable("sales_order_amendment", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),

  salesOrderId: uuid("sales_order_id")
    .notNull()
    .references(() => salesOrder.id),

  salesOrderLineId: uuid("sales_order_line_id")
    .notNull()
    .references(() => salesOrderLine.id),

  versionNumber: integer("version_number").notNull(),

  status: varchar("status", { length: 30 }).notNull(),

  reason: varchar("reason", { length: 2000 }).notNull(),

  previousQuantity: numeric("previous_quantity", { precision: 20, scale: 6 }).notNull(),

  proposedQuantity: numeric("proposed_quantity", { precision: 20, scale: 6 }).notNull(),

  previousExpectedAmount: numeric("previous_expected_amount", {
    precision: 20,
    scale: 6,
  }).notNull(),

  proposedExpectedAmount: numeric("proposed_expected_amount", {
    precision: 20,
    scale: 6,
  }).notNull(),

  previousCommercialContractId: varchar("previous_commercial_contract_id", {
    length: 120,
  }),

  proposedCommercialContractId: varchar("proposed_commercial_contract_id", {
    length: 120,
  }).notNull(),

  previousSnapshotId: uuid("previous_snapshot_id"),

  proposedSnapshotId: uuid("proposed_snapshot_id").notNull(),

  snapshotPayload: jsonb("snapshot_payload").notNull(),

  contractPayload: jsonb("contract_payload").notNull(),

  proposedBy: uuid("proposed_by").notNull(),

  proposedAt: timestamp("proposed_at", { withTimezone: true }).defaultNow().notNull(),

  approvedBy: uuid("approved_by"),

  approvedAt: timestamp("approved_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  createdBy: uuid("created_by"),
});
