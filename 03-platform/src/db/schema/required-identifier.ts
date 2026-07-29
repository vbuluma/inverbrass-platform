/**
 * Purpose:
 * Required regulatory identifier definitions attached to a regulatory rule set.
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 *
 * Note:
 * Table name is domain-neutral so future Build Packs reuse the same configuration model.
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const requiredIdentifier = pgTable("required_identifier", {
  id: uuid("id").defaultRandom().primaryKey(),

  ruleSetCode: varchar("rule_set_code", { length: 80 }).notNull(),

  identifierTypeCode: varchar("identifier_type_code", { length: 50 }).notNull(),

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
