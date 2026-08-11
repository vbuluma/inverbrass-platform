/**
 * Purpose:
 * Sales order handoff stub — BP-006+ consumption contract.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.4)
 */

import {
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { currency } from "./currency";
import { party } from "./party";
import { product } from "./product";
import { quotation } from "./quotation";
import { quotationLine } from "./quotation";
import { quotationVersion } from "./quotation";

export const salesOrder = pgTable("sales_order", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),

  orderNumber: varchar("order_number", { length: 80 }).notNull(),

  quotationId: uuid("quotation_id")
    .notNull()
    .references(() => quotation.id),

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

  subtotal: numeric("subtotal", { precision: 20, scale: 6 })
    .default("0")
    .notNull(),

  taxAmount: numeric("tax_amount", { precision: 20, scale: 6 })
    .default("0")
    .notNull(),

  grandTotal: numeric("grand_total", { precision: 20, scale: 6 })
    .default("0")
    .notNull(),

  handoffStatus: varchar("handoff_status", { length: 50 })
    .default("PENDING")
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
});

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

  description: varchar("description", { length: 1000 }),

  quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),

  unitPrice: numeric("unit_price", { precision: 20, scale: 6 }).notNull(),

  lineTotal: numeric("line_total", { precision: 20, scale: 6 }).notNull(),

  quotationLineId: uuid("quotation_line_id").references(() => quotationLine.id),

  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
