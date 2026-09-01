/**
 * Purpose:
 * Lightweight supplier qualification records. Evidence references ENG-015
 * party documents — binaries are not stored here.
 *
 * Implementation Package:
 * BP-009 / IP-01 – Procurement Foundation & Supplier Relationship
 */

import {
  date,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { partyDocument } from "./party-document";
import { procurementProfile } from "./procurement-profile";

export const supplierQualification = pgTable("supplier_qualification", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),

  profileId: uuid("profile_id")
    .references(() => procurementProfile.id)
    .notNull(),

  qualificationTypeCode: varchar("qualification_type_code", {
    length: 50,
  }).notNull(),

  outcomeCode: varchar("outcome_code", { length: 50 }).notNull(),

  effectiveDate: date("effective_date").notNull(),

  expiryDate: date("expiry_date"),

  reviewDate: date("review_date"),

  reviewerUserId: uuid("reviewer_user_id"),

  notes: varchar("notes", { length: 4000 }),

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

export const procurementQualificationEvidence = pgTable(
  "procurement_qualification_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    qualificationId: uuid("qualification_id")
      .references(() => supplierQualification.id)
      .notNull(),

    documentId: uuid("document_id")
      .references(() => partyDocument.id)
      .notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),
  },
  (table) => [
    uniqueIndex("procurement_qualification_evidence_uidx").on(
      table.qualificationId,
      table.documentId
    ),
  ]
);
