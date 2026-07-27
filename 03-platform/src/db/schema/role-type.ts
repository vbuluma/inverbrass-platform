/**
 * Purpose:
 * Platform reference catalogue for Party Role Types (Customer, Supplier, etc.).
 *
 * Distinct from IAM `role` — this catalogue describes business roles a Party
 * may perform, not platform access-control roles.
 *
 * Implementation Package:
 * BP-002 / IP-002 – Party Roles
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const roleType = pgTable("role_type", {
  id: uuid("id").defaultRandom().primaryKey(),

  code: varchar("code", { length: 50 }).notNull().unique(),

  name: varchar("name", { length: 100 }).notNull(),

  description: varchar("description", { length: 500 }),

  displayOrder: integer("display_order").default(0).notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
