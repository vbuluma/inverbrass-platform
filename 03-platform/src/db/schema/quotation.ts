/**
 * Purpose:
 * Quotation header, version, and line item persistence for BP-004 CRM.
 *
 * Design rationale:
 * Versions are immutable once sent (BRU-005). Lines belong to a version.
 * CRM entity references (crmRecordId, accountId, opportunityId) are UUID
 * columns without FK constraints until CRM Core schema merges.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.1)
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
import { pricingCatalogue } from "./pricing-catalogue";
import { pricingItem } from "./pricing-item";
import { product } from "./product";
import { unitOfMeasure } from "./unit-of-measure";

export const quotation = pgTable("quotation", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),

  quotationNumber: varchar("quotation_number", { length: 80 }).notNull(),

  /** CRM master record — FK added when IP-01 schema merges */
  crmRecordId: uuid("crm_record_id"),

  partyId: uuid("party_id")
    .notNull()
    .references(() => party.id),

  /** Customer account — FK added when IP-04 schema merges */
  accountId: uuid("account_id"),

  /** Opportunity — FK added when IP-03 schema merges */
  opportunityId: uuid("opportunity_id"),

  status: varchar("status", { length: 50 }).notNull(),

  currencyCode: varchar("currency_code", { length: 3 })
    .notNull()
    .references(() => currency.code),

  pricingCatalogueId: uuid("pricing_catalogue_id").references(
    () => pricingCatalogue.id
  ),

  customerSegment: varchar("customer_segment", { length: 100 }),

  salesChannel: varchar("sales_channel", { length: 100 }),

  region: varchar("region", { length: 100 }),

  validUntil: timestamp("valid_until", { withTimezone: true }),

  currentVersionNumber: integer("current_version_number").default(1).notNull(),

  ownerUserId: uuid("owner_user_id"),

  notes: varchar("notes", { length: 4000 }),

  termsTemplateCode: varchar("terms_template_code", { length: 100 }),

  approvalStatus: varchar("approval_status", { length: 50 })
    .default("NOT_REQUIRED")
    .notNull(),

  approvedAt: timestamp("approved_at", { withTimezone: true }),

  approvedBy: uuid("approved_by"),

  documentSnapshot: jsonb("document_snapshot"),

  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  createdBy: uuid("created_by"),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedBy: uuid("updated_by"),

  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  version: integer("version").default(1).notNull(),
});

export const quotationVersion = pgTable("quotation_version", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),

  quotationId: uuid("quotation_id")
    .notNull()
    .references(() => quotation.id),

  versionNumber: integer("version_number").notNull(),

  status: varchar("status", { length: 50 }).notNull(),

  subtotal: numeric("subtotal", { precision: 20, scale: 6 })
    .default("0")
    .notNull(),

  taxAmount: numeric("tax_amount", { precision: 20, scale: 6 })
    .default("0")
    .notNull(),

  grandTotal: numeric("grand_total", { precision: 20, scale: 6 })
    .default("0")
    .notNull(),

  revisionReason: varchar("revision_reason", { length: 500 }),

  sentAt: timestamp("sent_at", { withTimezone: true }),

  lockedAt: timestamp("locked_at", { withTimezone: true }),

  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  createdBy: uuid("created_by"),
});

export const quotationLine = pgTable("quotation_line", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),

  quotationVersionId: uuid("quotation_version_id")
    .notNull()
    .references(() => quotationVersion.id),

  lineNumber: integer("line_number").notNull(),

  offeringId: uuid("offering_id")
    .notNull()
    .references(() => product.id),

  offeringVariantId: uuid("offering_variant_id"),

  description: varchar("description", { length: 1000 }),

  quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),

  unitOfMeasureId: uuid("unit_of_measure_id").references(
    () => unitOfMeasure.id
  ),

  unitPrice: numeric("unit_price", { precision: 20, scale: 6 }).notNull(),

  pricingItemId: uuid("pricing_item_id").references(() => pricingItem.id),

  lineTotal: numeric("line_total", { precision: 20, scale: 6 }).notNull(),

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
