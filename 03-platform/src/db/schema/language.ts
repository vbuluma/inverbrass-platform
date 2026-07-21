import {
    pgTable,
    uuid,
    varchar,
    boolean,
    integer,
    timestamp,
  } from "drizzle-orm/pg-core";
  
  export const language = pgTable("language", {
    // Primary Key
    id: uuid("id").defaultRandom().primaryKey(),
  
    // ISO 639-1 Language Code (en, sw, fr)
    code: varchar("code", { length: 5 })
      .notNull()
      .unique(),
  
    // Language Name
    name: varchar("name", { length: 100 })
      .notNull(),
  
    // Native Name
    nativeName: varchar("native_name", { length: 100 })
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