/**
 * Purpose:
 * Platform reference catalogue for Organization Types.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const organizationType = pgTable("organization_type", {
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
