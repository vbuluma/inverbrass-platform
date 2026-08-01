/**
 * Purpose:
 * Reference channels for digital catalogue publishing.
 *
 * Implementation Package:
 * BP-003 / IP-007 – Digital Catalogue Engine
 */

import {
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const catalogueChannel = pgTable(
  "catalogue_channel",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    code: varchar("code", { length: 80 }).notNull(),

    name: varchar("name", { length: 200 }).notNull(),

    description: varchar("description", { length: 1000 }),

    status: varchar("status", { length: 50 }).default("ACTIVE").notNull(),

    displayOrder: integer("display_order").default(0).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("catalogue_channel_code_uidx").on(table.code)]
);
