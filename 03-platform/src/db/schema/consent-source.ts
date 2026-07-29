/**
 * ENG-003b — Configurable Consent Source reference entity.
 *
 * Country administrators configure valid consent sources per jurisdiction.
 * Owned by Localization & Regulatory Engine — not hardcoded in Party module.
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { country } from "./country";

export const consentSource = pgTable(
  "consent_source",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    /** Stable platform code, e.g. ONLINE_REGISTRATION */
    code: varchar("code", { length: 80 }).notNull(),

    /** Display label, e.g. Online Registration */
    name: varchar("name", { length: 200 }).notNull(),

    /** ISO country code — null = global default */
    countryCode: varchar("country_code", { length: 2 }).references(
      () => country.code
    ),

    description: varchar("description", { length: 500 }),

    displayOrder: integer("display_order").default(0).notNull(),

    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("consent_source_country_code_uidx").on(
      table.countryCode,
      table.code
    ),
  ]
);
