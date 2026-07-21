import {
    pgTable,
    uuid,
    varchar,
    boolean,
    integer,
    timestamp,
  } from "drizzle-orm/pg-core";
  
  import { paymentProvider } from "./payment-provider";
  
  export const paymentChannel = pgTable("payment_channel", {
    // Primary Key
    id: uuid("id").defaultRandom().primaryKey(),
  
    // Parent Provider
    paymentProviderId: uuid("payment_provider_id")
      .references(() => paymentProvider.id)
      .notNull(),
  
    // Channel Code
    code: varchar("code", { length: 50 })
      .notNull()
      .unique(),
  
    // Channel Name
    name: varchar("name", { length: 100 })
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