/**
 * Purpose:
 * Captured regulatory identifiers belonging to a Party (master data, not evidence).
 *
 * Design rationale:
 * Uploaded documents are evidence (`party_document`). Regulatory identifiers are
 * authoritative master data owned by ENG-003j Identity & Regulatory Identification Engine.
 * `linked_document_id` references evidence without duplicating document metadata.
 *
 * Implementation Package:
 * BP-002 / IP-013 – Identity & Regulatory Information
 *
 * Engine:
 * ENG-003j – Identity & Regulatory Identification Engine
 */

import {
  boolean,
  date,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { party } from "./party";
import { partyDocument } from "./party-document";

export const partyIdentityIdentifier = pgTable("party_identity_identifier", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),

  partyId: uuid("party_id")
    .references(() => party.id)
    .notNull(),

  identifierTypeCode: varchar("identifier_type_code", { length: 50 }).notNull(),

  identifierValue: varchar("identifier_value", { length: 500 }).notNull(),

  issuingCountryCode: varchar("issuing_country_code", { length: 2 }),

  issuingAuthority: varchar("issuing_authority", { length: 200 }),

  issueDate: date("issue_date"),

  expiryDate: date("expiry_date"),

  statusCode: varchar("status_code", { length: 50 }).notNull(),

  verificationStatus: varchar("verification_status", { length: 50 }).notNull(),

  verificationMethod: varchar("verification_method", { length: 50 }),

  verifiedBy: uuid("verified_by"),

  verifiedAt: timestamp("verified_at", { withTimezone: true }),

  primaryIdentifier: boolean("primary_identifier").default(false).notNull(),

  linkedDocumentId: uuid("linked_document_id").references(() => partyDocument.id),

  notes: varchar("notes", { length: 2000 }),

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
