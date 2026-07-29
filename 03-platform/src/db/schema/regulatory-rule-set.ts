/**
 * Purpose:
 * Regulatory rule sets — country / party-type / industry document policies.
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

export const regulatoryRuleSet = pgTable("regulatory_rule_set", {
  id: uuid("id").defaultRandom().primaryKey(),

  code: varchar("code", { length: 80 }).notNull().unique(),

  name: varchar("name", { length: 200 }).notNull(),

  countryCode: varchar("country_code", { length: 2 }).notNull(),

  partyTypeCode: varchar("party_type_code", { length: 50 }).notNull(),

  /** Null applies the rule set to all industries for the country + party type. */
  industryCode: varchar("industry_code", { length: 50 }),

  displayOrder: integer("display_order").default(0).notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
