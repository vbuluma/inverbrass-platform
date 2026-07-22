import {
  pgTable,
  uuid,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";

import { businessType } from "./business-type";

export const business = pgTable("business", {
  // Primary Key
  id: uuid("id").defaultRandom().primaryKey(),

  // Business Code
  code: varchar("code", { length: 20 })
    .notNull()
    .unique(),

  // Business Name
  name: varchar("name", { length: 200 })
    .notNull(),

  // Business Contact Phone (E.164)
  phoneNumber: varchar("phone_number", { length: 30 }).notNull(),

  // Business Type
  businessTypeId: uuid("business_type_id")
    .references(() => businessType.id)
    .notNull(),

  // Business Status
  statusCode: varchar("status_code", { length: 20 })
    .notNull(),

  // Country
  countryCode: varchar("country_code", { length: 2 })
    .notNull(),

  // Time Zone
  timezone: varchar("timezone", { length: 100 })
    .notNull(),

  // Audit Fields
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