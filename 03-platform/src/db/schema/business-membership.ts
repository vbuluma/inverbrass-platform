import {
    pgTable,
    uuid,
    varchar,
    boolean,
    timestamp,
  } from "drizzle-orm/pg-core";
  
  import { business } from "./business";
  import { platformUser } from "./platform-user";
  
  export const businessMembership = pgTable("business_membership", {
    // Primary Key
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),
  
    // Business
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
  
    // Platform User
    platformUserId: uuid("platform_user_id")
      .references(() => platformUser.id)
      .notNull(),
  
      
    // Membership Status
    status: varchar("status", { length: 30 })
      .notNull(),
  
    // Default Business
    isPrimary: boolean("is_primary")
      .default(false)
      .notNull(),
  
    // Membership Dates
    joinedAt: timestamp("joined_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  
    endedAt: timestamp("ended_at", {
      withTimezone: true,
    }),
  
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