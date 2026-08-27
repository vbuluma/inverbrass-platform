/**
 * Purpose:
 * Link ENG-015 documents to offerings (multi-offering support).
 *
 * Implementation Package:
 * BP-003 / IP-009 – Offering Documents & Compliance
 */

import {
  boolean,
  date,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { offeringDocument } from "./offering-document";

export const offeringDocumentLink = pgTable("offering_document_link", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),

  offeringId: uuid("offering_id").notNull(),

  offeringType: varchar("offering_type", { length: 50 }).notNull(),

  documentId: uuid("document_id")
    .references(() => offeringDocument.id)
    .notNull(),

  isPrimary: boolean("is_primary").default(true).notNull(),

  effectiveFrom: date("effective_from"),

  effectiveTo: date("effective_to"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
