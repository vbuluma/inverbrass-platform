/**
 * Purpose:
 * Per-user security controls: password hash, lockout, and first-login flags.
 *
 * Design rationale (BP-001 Stage 1):
 * Passwords are platform-owned and stored only as bcrypt hashes in PostgreSQL.
 * Supabase Auth is not the primary authentication mechanism.
 *
 * Why this exists:
 * Keeps credential and lockout state with the Platform User security profile.
 */

import {
  pgTable,
  uuid,
  boolean,
  integer,
  timestamp,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { platformUser } from "./platform-user";

export const userSecurityProfile = pgTable(
  "user_security_profile",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    platformUserId: uuid("platform_user_id")
      .references(() => platformUser.id)
      .notNull(),

    /**
     * WHAT: bcrypt password hash for Stage 1 platform authentication.
     * WHY: Passwords must never be stored in plain text; PostgreSQL is SoT.
     */
    passwordHash: varchar("password_hash", { length: 255 }),

    mustChangePassword: boolean("must_change_password")
      .default(false)
      .notNull(),

    failedLoginAttempts: integer("failed_login_attempts")
      .default(0)
      .notNull(),

    lockedUntil: timestamp("locked_until", {
      withTimezone: true,
    }),

    lastLoginAt: timestamp("last_login_at", {
      withTimezone: true,
    }),

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
  },
  (table) => [
    uniqueIndex("user_security_profile_platform_user_uidx").on(
      table.platformUserId
    ),
  ]
);
