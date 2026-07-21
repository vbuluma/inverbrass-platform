import {
    pgTable,
    uuid,
    varchar,
    boolean,
    integer,
    timestamp,
  } from "drizzle-orm/pg-core";
  
  import { business } from "./business";
  
  export const role = pgTable("role", {
    // Primary Key
    id: uuid("id").defaultRandom().primaryKey(),
  
    // Null = Platform Role
    businessId: uuid("business_id")
      .references(() => business.id),
  
    // Business Key
    code: varchar("code", { length: 100 })
      .notNull()
      .unique(),
  
    // Name
    name: varchar("name", { length: 150 })
      .notNull(),
  
    // Description
    description: varchar("description", { length: 500 }),
  
    // Display Order
    displayOrder: integer("display_order")
      .default(0)
      .notNull(),
  
    // Status
    isActive: boolean("is_active")
      .default(true)
      .notNull(),
  
    // Audit
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