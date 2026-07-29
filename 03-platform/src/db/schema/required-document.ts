/**
 * Purpose:
 * Required document definitions attached to a regulatory rule set (ENG-003b).
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 *
 * Note:
 * Table name `required_document` is intentionally domain-neutral so future
 * Build Packs (Property, HR, Fleet, etc.) reuse the same configuration model.
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const requiredDocument = pgTable("required_document", {
  id: uuid("id").defaultRandom().primaryKey(),

  ruleSetCode: varchar("rule_set_code", { length: 80 }).notNull(),

  documentTypeCode: varchar("document_type_code", { length: 50 }).notNull(),

  requirementLevel: varchar("requirement_level", { length: 20 }).notNull(),

  displayOrder: integer("display_order").default(0).notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** @deprecated Use `requiredDocument` — retained for migration compatibility reads. */
export const regulatoryDocumentRequirement = requiredDocument;
