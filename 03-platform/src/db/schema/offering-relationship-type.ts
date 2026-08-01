/**
 * Purpose:
 * Configurable offering relationship types (ENG-003b catalogue).
 *
 * Implementation Package:
 * BP-003 / IP-010 – Offering Relationships
 */

import {
  boolean,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";

export const offeringRelationshipType = pgTable(
  "offering_relationship_type",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    code: varchar("code", { length: 80 }).notNull(),

    name: varchar("name", { length: 300 }).notNull(),

    description: varchar("description", { length: 2000 }),

    isBidirectional: boolean("is_bidirectional").default(false).notNull(),

    isActive: boolean("is_active").default(true).notNull(),

    sortOrder: integer("sort_order").default(0).notNull(),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("offering_relationship_type_business_code_uidx")
      .on(table.businessId, table.code)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
