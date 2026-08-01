/**
 * Purpose:
 * Configurable pricing method reference catalogue (platform-wide).
 *
 * Architecture:
 * Reusable platform pricing capability consumed by BP-003 Offering Pricing.
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const pricingMethod = pgTable(
  "pricing_method",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    code: varchar("code", { length: 80 }).notNull(),

    name: varchar("name", { length: 200 }).notNull(),

    description: varchar("description", { length: 500 }),

    displayOrder: integer("display_order").default(0).notNull(),

    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("pricing_method_code_uidx").on(table.code)]
);
