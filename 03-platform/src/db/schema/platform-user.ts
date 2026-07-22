import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const platformUser = pgTable("platform_user", {
  // Primary Key
  id: uuid("id").defaultRandom().primaryKey(),

  // Authentication Provider User ID (Supabase Auth)
  authUserId: uuid("auth_user_id").notNull().unique(),

  // Staff / Employee Identifier
  staffCode: varchar("staff_code", { length: 50 }),

  // Personal Information
  firstName: varchar("first_name", { length: 100 }).notNull(),

  lastName: varchar("last_name", { length: 100 }).notNull(),

  displayName: varchar("display_name", { length: 200 }),

  // Contact Information
  email: varchar("email", { length: 255 }).notNull(),

  phoneNumber: varchar("phone_number", { length: 30 }),

  // Status
  isActive: boolean("is_active").default(true).notNull(),

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
