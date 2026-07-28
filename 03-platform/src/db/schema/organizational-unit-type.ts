/**
 * Purpose:
 * Platform reference catalogue for Organizational Unit Types.
 *
 * Engine:
 * ENG-003c – Organization Structure Engine
 *
 * Implementation Package:
 * BP-002 / IP-005 – Organization Structure Engine (refactored)
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const organizationalUnitType = pgTable("organizational_unit_type", {
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
