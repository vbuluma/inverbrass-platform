import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const businessType = pgTable("business_type", {
  // Primary Key
  id: uuid("id").defaultRandom().primaryKey(),

  // Business Type Code (Unique)
  code: varchar("code", { length: 50 })
    .notNull()
    .unique(),

  // Business Type Name
  name: varchar("name", { length: 100 })
    .notNull(),

  // Description
  description: varchar("description", { length: 500 }),

  // UI Icon Identifier
  iconCode: varchar("icon", { length: 100 }),

  // Display Order
  displayOrder: integer("display_order")
    .default(0)
    .notNull(),

  // Status
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