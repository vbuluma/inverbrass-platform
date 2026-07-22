import {
  pgTable,
  uuid,
  boolean,
  integer,
  timestamp,
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
