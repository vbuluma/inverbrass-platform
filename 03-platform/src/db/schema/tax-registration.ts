/**
 * Purpose:
 * Tax authority registrations linked to a business compliance profile.
 *
 * Implementation Package:
 * BP-005 / IP-11 – Tax Compliance, Remittance & Evidence Management
 */

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { taxComplianceProfile } from "./tax-compliance-profile";

export const taxRegistration = pgTable(
  "tax_registration",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    profileId: uuid("profile_id")
      .notNull()
      .references(() => taxComplianceProfile.id),

    countryCode: varchar("country_code", { length: 2 }).notNull(),

    jurisdictionCode: varchar("jurisdiction_code", { length: 40 }).notNull(),

    taxAuthorityCode: varchar("tax_authority_code", { length: 40 }).notNull(),

    registrationType: varchar("registration_type", { length: 80 }).notNull(),

    registrationNumber: varchar("registration_number", {
      length: 120,
    }).notNull(),

    taxTypeCode: varchar("tax_type_code", { length: 50 }),

    effectiveFrom: timestamp("effective_from", { withTimezone: true }),

    effectiveTo: timestamp("effective_to", { withTimezone: true }),

    isActive: boolean("is_active").default(true).notNull(),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedBy: uuid("updated_by"),

    version: integer("version").default(1).notNull(),
  },
  (table) => [
    index("tax_registration_business_idx").on(table.businessId),
  ]
);
