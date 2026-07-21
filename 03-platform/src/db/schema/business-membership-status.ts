import {
    pgTable,
    uuid,
    varchar,
    boolean,
    integer,
    timestamp,
  } from "drizzle-orm/pg-core";
  
  export const businessMembershipStatus = pgTable(
    "business_membership_status",
    {
      // Primary Key
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),
  
      // Business Key
      code: varchar("code", { length: 30 })
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
    }
  );