/**
 * Purpose:
 * Persist business operating locations (branches) created during setup.
 *
 * Design rationale:
 * Branch setup captures identity and contact fields only — no operational
 * settings — so later Build Packs can extend configuration without redesign.
 *
 * Implementation Package:
 * BP-001 – Business Onboarding Enhancement & Stabilization
 */

import {
  boolean,
  date,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";

export const branch = pgTable(
  "branch",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    code: varchar("code", { length: 30 }).notNull(),

    name: varchar("name", { length: 200 }).notNull(),

    branchType: varchar("branch_type", { length: 50 }).notNull(),

    physicalAddress: varchar("physical_address", { length: 500 }).notNull(),

    county: varchar("county", { length: 150 }).notNull(),

    city: varchar("city", { length: 150 }).notNull(),

    contactPhone: varchar("contact_phone", { length: 30 }).notNull(),

    email: varchar("email", { length: 255 }),

    gpsLatitude: numeric("gps_latitude", { precision: 10, scale: 7 }),

    gpsLongitude: numeric("gps_longitude", { precision: 10, scale: 7 }),

    openingDate: date("opening_date"),

    isActive: boolean("is_active").default(true).notNull(),

    isHeadOffice: boolean("is_head_office").default(false).notNull(),

    isDefault: boolean("is_default").default(false).notNull(),

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
    uniqueIndex("branch_business_code_uidx").on(table.businessId, table.code),
  ]
);
