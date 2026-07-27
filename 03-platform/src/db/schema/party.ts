/**
 * Purpose:
 * Master Party repository — single reusable record for Individuals and Organizations.
 *
 * Design rationale:
 * Party Type is immutable after creation. Lifecycle is driven by Party Status.
 * Profile-specific attributes live on Individual / Organization profile tables.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import {
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";

export const party = pgTable(
  "party",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    /** System-generated business-facing Party ID (unique per tenant). */
    partyNumber: varchar("party_number", { length: 40 }).notNull(),

    /** Immutable after creation — INDIVIDUAL | ORGANIZATION. */
    partyTypeCode: varchar("party_type_code", { length: 50 }).notNull(),

    displayName: varchar("display_name", { length: 300 }).notNull(),

    statusCode: varchar("status_code", { length: 50 }).notNull(),

    notes: varchar("notes", { length: 2000 }),

    registrationDate: timestamp("registration_date", { withTimezone: true })
      .defaultNow()
      .notNull(),

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
    uniqueIndex("party_business_number_uidx").on(
      table.businessId,
      table.partyNumber
    ),
  ]
);
