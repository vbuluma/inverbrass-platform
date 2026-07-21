import {
    pgTable,
    uuid,
    varchar,
    boolean,
    integer,
    timestamp,
  } from "drizzle-orm/pg-core";
  
  export const timezone = pgTable("timezone", {
    // Primary Key
    id: uuid("id").defaultRandom().primaryKey(),
  
    // IANA Timezone Code
    code: varchar("code", { length: 100 })
      .notNull()
      .unique(),
  
    // Display Name
    name: varchar("name", { length: 150 })
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