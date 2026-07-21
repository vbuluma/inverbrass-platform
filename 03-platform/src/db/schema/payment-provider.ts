import {
    pgTable,
    uuid,
    varchar,
    boolean,
    integer,
    timestamp,
  } from "drizzle-orm/pg-core";
  
  import { paymentNetwork } from "./payment-network";
  
  export const paymentProvider = pgTable("payment_provider", {
    // Primary Key
    id: uuid("id").defaultRandom().primaryKey(),
  
    // Parent Network / Rails
    paymentNetworkId: uuid("payment_network_id")
      .references(() => paymentNetwork.id)
      .notNull(),
  
    // Unique Code
    code: varchar("code", { length: 50 })
      .notNull()
      .unique(),
  
    // Provider Name
    name: varchar("name", { length: 150 })
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