/**
 * Purpose:
 * Individual-specific attributes for a Party of type Individual.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import { date, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { party } from "./party";

export const individualProfile = pgTable("individual_profile", {
  id: uuid("id").defaultRandom().primaryKey(),

  partyId: uuid("party_id")
    .references(() => party.id)
    .notNull()
    .unique(),

  fullName: varchar("full_name", { length: 300 }).notNull(),

  dateOfBirth: date("date_of_birth"),

  gender: varchar("gender", { length: 50 }),

  preferredLanguageCode: varchar("preferred_language_code", { length: 10 }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
