import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

import { industry } from "./industry";

export const businessType = pgTable("business_type", {
  // Primary Key
  id: uuid("id").defaultRandom().primaryKey(),

  // Parent Industry
  industryId: uuid("industry_id")
    .references(() => industry.id)
    .notNull(),

  // Unique Business Type Code
  code: varchar("code", { length: 50 })
    .notNull()
    .unique(),

  // Business Type Name
  name: varchar("name", { length: 100 })
    .notNull(),

  // Description
  description: varchar("description", { length: 500 }),

  // UI Icon Identifier
  iconCode: varchar("icon_code", { length: 100 }),

  // Display Order
  displayOrder: integer("display_order")
    .default(0)
    .notNull(),

  // Active Flag
  isActive: boolean("is_active")
    .default(true)
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