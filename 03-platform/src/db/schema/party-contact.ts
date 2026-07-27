/**
 * Purpose:
 * Party communication channels (mobile, email, website, etc.).
 *
 * Design rationale:
 * One Preferred contact per Contact Type. Soft delete via deletedAt.
 * Verification only flips the verified flag (no OTP in IP-003).
 *
 * Implementation Package:
 * BP-002 / IP-003 – Contacts & Communication
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
import { sql } from "drizzle-orm";

import { business } from "./business";
import { party } from "./party";

export const partyContact = pgTable(
  "party_contact",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    partyId: uuid("party_id")
      .references(() => party.id)
      .notNull(),

    contactTypeCode: varchar("contact_type_code", { length: 50 }).notNull(),

    contactValue: varchar("contact_value", { length: 500 }).notNull(),

    isPreferred: boolean("is_preferred").default(false).notNull(),

    isVerified: boolean("is_verified").default(false).notNull(),

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
    uniqueIndex("party_contact_preferred_per_type_uidx")
      .on(table.partyId, table.contactTypeCode)
      .where(
        sql`${table.isPreferred} = true AND ${table.deletedAt} IS NULL AND ${table.statusCode} = 'ACTIVE'`
      ),
  ]
);
