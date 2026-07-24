/**
 * Purpose:
 * Currency master reference table (ISO 4217 attributes).
 *
 * WHY:
 * Business setup and finance capabilities need a shared currency catalogue.
 * Country points to a default currency code; this table owns currency identity.
 *
 * RATIONALE:
 * Single ownership of currency avoids duplicate country/currency catalogues.
 * ISO code, name, symbol, decimal places, and active status cover IP-006 needs.
 *
 * Implementation Package:
 * IP-002 foundation / IP-006 consumption
 */

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const currency = pgTable("currency", {
  id: uuid("id").defaultRandom().primaryKey(),

  // ISO 4217 Currency Code (KES, USD, EUR)
  code: varchar("code", { length: 3 }).notNull().unique(),

  // Currency Name
  name: varchar("name", { length: 100 }).notNull(),

  // Currency Symbol (KSh, $, €, £)
  symbol: varchar("symbol", { length: 10 }).notNull(),

  // ISO minor-unit decimal places
  decimalPlaces: integer("decimal_places").default(2).notNull(),

  displayOrder: integer("display_order").default(0).notNull(),

  // Active Status
  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});
