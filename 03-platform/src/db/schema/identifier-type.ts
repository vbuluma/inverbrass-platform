/**
 * Purpose:
 * Platform catalogue of regulatory identifier types (National ID, KRA PIN, etc.).
 *
 * Design rationale:
 * Country-specific labels and validation patterns are configuration — not hardcoded
 * in consumer modules. ENG-003b `required_identifier` references these codes.
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const identifierType = pgTable("identifier_type", {
  id: uuid("id").defaultRandom().primaryKey(),

  code: varchar("code", { length: 50 }).notNull().unique(),

  name: varchar("name", { length: 200 }).notNull(),

  description: varchar("description", { length: 500 }),

  /** Optional regex pattern for value validation — configured per identifier type. */
  validationPattern: varchar("validation_pattern", { length: 500 }),

  displayOrder: integer("display_order").default(0).notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
