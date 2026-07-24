/**
 * Purpose:
 * Persist remaining business profile attributes captured during IP-006 setup.
 *
 * Business Context:
 * Registration captures identity essentials. Setup completes trading identity,
 * contact, location, and branding before activation.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (A4)
 *
 * Implementation Package:
 * IP-006 – Business Setup Wizard, Configuration & Activation
 *
 * Responsibilities:
 * - Store one profile row per business
 *
 * Non-Responsibilities:
 * - Wizard orchestration (BusinessSetupService)
 * - Operating currencies or feature toggles
 *
 * Dependencies:
 * - business schema
 *
 * Business Rules Implemented:
 * - IP-006 BRD — Business Details fields
 *
 * Extension Points:
 * - Document storage may replace logoUrl with a document reference later
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

import { business } from "./business";

export const businessProfile = pgTable("business_profile", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull()
    .unique(),

  // When blank at save time, service copies business.name (IP-006 clarification).
  tradingName: varchar("trading_name", { length: 200 }).notNull(),

  logoUrl: text("logo_url").notNull(),

  email: varchar("email", { length: 255 }).notNull(),

  physicalAddress: varchar("physical_address", { length: 500 }).notNull(),

  county: varchar("county", { length: 150 }).notNull(),

  city: varchar("city", { length: 150 }).notNull(),

  website: varchar("website", { length: 500 }),

  description: varchar("description", { length: 2000 }),

  gpsLatitude: numeric("gps_latitude", { precision: 10, scale: 7 }),

  gpsLongitude: numeric("gps_longitude", { precision: 10, scale: 7 }),

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
