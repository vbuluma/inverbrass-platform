/**
 * Purpose:
 * BP-006 IP-03 delivery, inspection, and service-completion persistence.
 * Operational quantities live here — not as a competing fulfilled qty on the order line.
 *
 * Implementation Package:
 * BP-006 / IP-03 – Delivery, Inspection & Service Completion
 */

import {
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { salesOrder, salesOrderLine } from "./sales-order";

export const salesDeliveryEvent = pgTable("sales_delivery_event", {
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

  eventType: varchar("event_type", { length: 30 }).notNull(),

  status: varchar("status", { length: 40 }).notNull(),

  claimedQuantity: numeric("claimed_quantity", { precision: 20, scale: 6 }).notNull(),

  deliveredAt: timestamp("delivered_at", { withTimezone: true }).defaultNow().notNull(),

  recordedBy: uuid("recorded_by").notNull(),

  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),

  notes: varchar("notes", { length: 2000 }),

  evidenceNote: varchar("evidence_note", { length: 2000 }),

  evidenceRef: varchar("evidence_ref", { length: 500 }),

  completedBy: uuid("completed_by"),

  completedAt: timestamp("completed_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  createdBy: uuid("created_by"),
});

export const salesInspectionOutcome = pgTable("sales_inspection_outcome", {
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

  deliveryEventId: uuid("delivery_event_id")
    .notNull()
    .references(() => salesDeliveryEvent.id)
    .unique(),

  acceptedQuantity: numeric("accepted_quantity", { precision: 20, scale: 6 }).notNull(),

  rejectedQuantity: numeric("rejected_quantity", { precision: 20, scale: 6 })
    .default("0")
    .notNull(),

  comments: varchar("comments", { length: 2000 }),

  rejectionReasonCode: varchar("rejection_reason_code", { length: 40 }),

  qualityFindingCode: varchar("quality_finding_code", { length: 40 }),

  evidenceNote: varchar("evidence_note", { length: 2000 }),

  evidenceRef: varchar("evidence_ref", { length: 500 }),

  inspectedBy: uuid("inspected_by").notNull(),

  inspectedAt: timestamp("inspected_at", { withTimezone: true }).defaultNow().notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  createdBy: uuid("created_by"),
});
