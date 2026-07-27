/**
 * Purpose:
 * Directed links between two Parties (from → to) with a relationship type.
 *
 * Design rationale:
 * No self-relationships. One active relationship per from+to+type.
 * Soft delete via deletedAt; inactive rows retained for history.
 *
 * Implementation Package:
 * BP-002 / IP-005 – Party Relationships
 */

import {
  date,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { party } from "./party";

export const partyRelationship = pgTable(
  "party_relationship",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    fromPartyId: uuid("from_party_id")
      .references(() => party.id)
      .notNull(),

    toPartyId: uuid("to_party_id")
      .references(() => party.id)
      .notNull(),

    relationshipTypeCode: varchar("relationship_type_code", {
      length: 50,
    }).notNull(),

    startDate: date("start_date").notNull(),

    endDate: date("end_date"),

    statusCode: varchar("status_code", { length: 50 }).notNull(),

    notes: varchar("notes", { length: 2000 }),

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
    uniqueIndex("party_relationship_active_unique_uidx")
      .on(table.fromPartyId, table.toPartyId, table.relationshipTypeCode)
      .where(
        sql`${table.statusCode} = 'ACTIVE' AND ${table.deletedAt} IS NULL`
      ),
  ]
);
