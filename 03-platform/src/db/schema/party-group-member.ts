/**
 * Purpose:
 * Links Parties to Party Groups with configurable membership roles.
 *
 * Design rationale:
 * One active membership per party+group. Exited members retained as history.
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

import {
  boolean,
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
import { partyGroup } from "./party-group";

export const partyGroupMember = pgTable(
  "party_group_member",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    partyGroupId: uuid("party_group_id")
      .references(() => partyGroup.id)
      .notNull(),

    partyId: uuid("party_id")
      .references(() => party.id)
      .notNull(),

    membershipRoleCode: varchar("membership_role_code", {
      length: 50,
    }).notNull(),

    joinDate: date("join_date").notNull(),

    exitDate: date("exit_date"),

    statusCode: varchar("status_code", { length: 50 }).notNull(),

    isPrimaryContact: boolean("is_primary_contact").default(false).notNull(),

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
    uniqueIndex("party_group_member_active_unique_uidx")
      .on(table.partyGroupId, table.partyId)
      .where(
        sql`${table.statusCode} = 'ACTIVE' AND ${table.deletedAt} IS NULL`
      ),
  ]
);
