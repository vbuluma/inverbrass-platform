/**
 * Purpose:
 * Business-scoped tax compliance profile (jurisdiction defaults).
 * Not a tax calculation master — configuration for IP-11 compliance only.
 *
 * Implementation Package:
 * BP-005 / IP-11 – Tax Compliance, Remittance & Evidence Management
 */

import {
  boolean,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";

export const taxComplianceProfile = pgTable(
  "tax_compliance_profile",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    countryCode: varchar("country_code", { length: 2 }).notNull(),

    defaultJurisdictionCode: varchar("default_jurisdiction_code", {
      length: 40,
    }),

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
    uniqueIndex("tax_compliance_profile_business_uidx").on(table.businessId),
  ]
);
