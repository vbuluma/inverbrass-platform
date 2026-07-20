import {
    pgTable,
    uuid,
    varchar,
    timestamp,
  } from "drizzle-orm/pg-core";
  
  import { businessType } from "./business-type";
  
  export const business = pgTable("business", {
    id: uuid("id").defaultRandom().primaryKey(),
  
    code: varchar("code", { length: 20 }).notNull().unique(),
  
    name: varchar("name", { length: 200 }).notNull(),
  
    business_type_id: uuid("business_type_id")
      .references(() => businessType.id)
      .notNull(),
  
    status: varchar("status", { length: 20 }).notNull(),
  
    country_code: varchar("country_code", { length: 2 }).notNull(),
  
    timezone: varchar("timezone", { length: 100 }).notNull(),
  
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