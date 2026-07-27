/**
 * Purpose:
 * Assign one or more business roles to a Party without duplicating Party records.
 *
 * Design rationale:
 * Active roles are unique per (party, role_type). Historical roles are retained
 * via status / endDate — never physically deleted.
 *
 * Implementation Package:
 * BP-002 / IP-002 – Party Roles
 */

import {
  boolean,
  date,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { party } from "./party";

export const partyRole = pgTable(
  "party_role",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    partyId: uuid("party_id")
      .references(() => party.id)
      .notNull(),

    roleTypeCode: varchar("role_type_code", { length: 50 }).notNull(),

    statusCode: varchar("status_code", { length: 50 }).notNull(),

    isPrimary: boolean("is_primary").default(false).notNull(),

    effectiveDate: date("effective_date").notNull(),

    endDate: date("end_date"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedBy: uuid("updated_by"),
  },
  (table) => [
    uniqueIndex("party_role_active_unique_uidx")
      .on(table.partyId, table.roleTypeCode)
      .where(sql`${table.statusCode} = 'ACTIVE'`),
  ]
);
