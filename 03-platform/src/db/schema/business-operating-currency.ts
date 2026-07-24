/**
 * Purpose:
 * Store operating currencies enabled for a business, including the base currency.
 *
 * Business Context:
 * IP-006 requires exactly one base currency and optional additional currencies
 * without duplicates.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 *
 * Implementation Package:
 * IP-006 – Business Setup Wizard, Configuration & Activation
 *
 * Responsibilities:
 * - Persist per-business currency selections
 *
 * Non-Responsibilities:
 * - Currency catalog administration
 * - FX rates (Finance capability)
 *
 * Dependencies:
 * - business, currency schemas
 *
 * Business Rules Implemented:
 * - BR-003, BR-004, BR-005 — multi-currency with single base, no duplicates
 *
 * Extension Points:
 * - Exchange-rate linkage may be added by Finance Build Packs
 */

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { business } from "./business";

export const businessOperatingCurrency = pgTable(
  "business_operating_currency",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    currencyCode: varchar("currency_code", { length: 3 }).notNull(),

    // BR-004 — exactly one base currency per business (enforced in service).
    isBase: boolean("is_base").default(false).notNull(),

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
  },
  (table) => [
    uniqueIndex("business_operating_currency_business_currency_uidx").on(
      table.businessId,
      table.currencyCode
    ),
  ]
);
