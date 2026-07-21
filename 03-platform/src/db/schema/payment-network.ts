import {
    pgTable,
    uuid,
    varchar,
    boolean,
    integer,
    timestamp,
  } from "drizzle-orm/pg-core";
  
  import { paymentMethod } from "./payment-method";
  
  export const paymentNetwork = pgTable("payment_network", {
    // Primary Key
    id: uuid("id").defaultRandom().primaryKey(),
  
    // Parent Payment Method
    paymentMethodId: uuid("payment_method_id")
      .references(() => paymentMethod.id)
      .notNull(),
  
    // Network / Rails Code
    code: varchar("code", { length: 50 })
      .notNull()
      .unique(),
  
    // Display Name
    name: varchar("name", { length: 100 })
      .notNull(),
  
    // Description
    description: varchar("description", { length: 500 }),
  
    // Display Order
    displayOrder: integer("display_order")
      .default(0)
      .notNull(),
  
    // Active Flag
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