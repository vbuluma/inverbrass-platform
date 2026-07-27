/**
 * Purpose:
 * Organization-specific attributes for a Party of type Organization.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { party } from "./party";

export const organizationProfile = pgTable("organization_profile", {
  id: uuid("id").defaultRandom().primaryKey(),

  partyId: uuid("party_id")
    .references(() => party.id)
    .notNull()
    .unique(),

  organizationName: varchar("organization_name", { length: 300 }).notNull(),

  registrationNumber: varchar("registration_number", { length: 100 }),

  taxNumber: varchar("tax_number", { length: 100 }),

  industryCode: varchar("industry_code", { length: 50 }).notNull(),

  organizationTypeCode: varchar("organization_type_code", {
    length: 50,
  }).notNull(),

  website: varchar("website", { length: 500 }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
