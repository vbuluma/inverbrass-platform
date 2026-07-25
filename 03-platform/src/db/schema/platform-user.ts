/**
 * Purpose:
 * Canonical Platform User identity table (PostgreSQL source of truth).
 *
 * Design rationale (BP-001 Stage 1):
 * Authentication is platform-owned (mobile + password hash). Email remains in
 * the model but is optional. auth_user_id is a legacy bridge column and may be null.
 *
 * Why this exists:
 * Separates Platform User identity from Tenant Business provisioning.
 */

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const platformUser = pgTable("platform_user", {
  id: uuid("id").defaultRandom().primaryKey(),

  /**
   * WHAT: Optional legacy identity-provider bridge UUID.
   * WHY: Stage 1 no longer requires Supabase Auth; column retained for compatibility.
   */
  authUserId: uuid("auth_user_id").unique(),

  staffCode: varchar("staff_code", { length: 50 }),

  firstName: varchar("first_name", { length: 100 }).notNull(),

  lastName: varchar("last_name", { length: 100 }).notNull(),

  displayName: varchar("display_name", { length: 200 }),

  /**
   * WHAT: Optional contact email.
   * WHY: Not required for registration/login; reserved for future notifications/recovery.
   */
  email: varchar("email", { length: 255 }),

  phoneNumber: varchar("phone_number", { length: 30 }),

  /**
   * WHAT: Optional temporary proposed business name from Platform Registration.
   * WHY: Prefills Business Creation without creating a Business at signup.
   */
  proposedBusinessName: varchar("proposed_business_name", { length: 200 }),

  isActive: boolean("is_active").default(true).notNull(),

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
