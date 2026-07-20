import {
    pgTable,
    uuid,
    varchar,
    boolean,
    integer,
    timestamp,
  } from "drizzle-orm/pg-core";
  
  export const businessType = pgTable("business_type", {
    id: uuid("id").defaultRandom().primaryKey(),
  
    code: varchar("code", { length: 50 }).notNull().unique(),
  
    name: varchar("name", { length: 100 }).notNull(),
  
    description: varchar("description", { length: 500 }),
  
    icon: varchar("icon", { length: 100 }),
  
    display_order: integer("display_order").default(0).notNull(),
  
    is_active: boolean("is_active").default(true).notNull(),
  
    created_at: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  
    updated_at: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  });