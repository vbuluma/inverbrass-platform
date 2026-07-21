import {
    pgTable,
    uuid,
    varchar,
    boolean,
    integer,
    timestamp,
  } from "drizzle-orm/pg-core";
  
  export const paymentMethod = pgTable("payment_method", {
    // Primary Key
    id: uuid("id").defaultRandom().primaryKey(),
  
    // Unique Code
    code: varchar("code", { length: 30 })
      .notNull()
      .unique(),
  
    // Display Name
    name: varchar("name", { length: 100 })
      .notNull(),
  
    // Description
    description: varchar("description", { length: 500 }),
  
    // Display Icon
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