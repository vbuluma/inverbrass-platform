/**
 * Purpose:
 * Configurable Party Groups — collections of Parties (not Organizations or OUs).
 *
 * Design rationale:
 * Groups aggregate Parties for vertical Build Packs (Chama, Farmer Group, etc.).
 * Soft delete via deletedAt; inactive rows retained for history.
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

import {
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";

export const partyGroup = pgTable(
  "party_group",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    groupName: varchar("group_name", { length: 200 }).notNull(),

    groupCode: varchar("group_code", { length: 50 }).notNull(),

    groupTypeCode: varchar("group_type_code", { length: 50 }).notNull(),

    statusCode: varchar("status_code", { length: 50 }).notNull(),

    description: varchar("description", { length: 2000 }),

    countryCode: varchar("country_code", { length: 2 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedBy: uuid("updated_by"),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("party_group_code_uidx")
      .on(table.businessId, table.groupCode)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
