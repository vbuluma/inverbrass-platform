import {
    pgTable,
    uuid,
    varchar,
    boolean,
    integer,
    timestamp,
  } from "drizzle-orm/pg-core";
  
  export const country = pgTable("country", {
    // Primary Key
    id: uuid("id").defaultRandom().primaryKey(),
  
    // ISO 3166-1 Alpha-2 (KE, UG, TZ)
    code: varchar("code", { length: 2 })
      .notNull()
      .unique(),
  
    // ISO 3166-1 Alpha-3 (KEN, UGA, TZA)
    iso3Code: varchar("iso3_code", { length: 3 })
      .notNull()
      .unique(),
  
    // Country Name
    name: varchar("name", { length: 100 })
      .notNull(),
  
    // International Dialling Code (+254)
    phoneCode: varchar("phone_code", { length: 10 })
      .notNull(),
  
    // References (to be linked later)
    currencyCode: varchar("currency_code", { length: 3 })
      .notNull(),
  
    timezoneCode: varchar("timezone_code", { length: 100 })
      .notNull(),
  
    // UI Display Order
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