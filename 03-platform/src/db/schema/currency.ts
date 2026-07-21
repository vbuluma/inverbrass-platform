import {
    pgTable,
    uuid,
    varchar,
    boolean,
    integer,
    timestamp,
  } from "drizzle-orm/pg-core";
  
  export const currency = pgTable("currency", {
    // Primary Key
    id: uuid("id").defaultRandom().primaryKey(),
  
    // ISO 4217 Currency Code (KES, USD, EUR)
    code: varchar("code", { length: 3 })
      .notNull()
      .unique(),
  
    // Currency Name
    name: varchar("name", { length: 100 })
      .notNull(),
  
    // Currency Symbol (KSh, $, €, £)
    symbol: varchar("symbol", { length: 10 })
      .notNull(),
  
    // Number of Decimal Places
    decimalPlaces: integer("decimal_places")
      .default(2)
      .notNull(),
  
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