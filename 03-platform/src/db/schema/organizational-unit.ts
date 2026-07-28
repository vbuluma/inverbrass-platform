/**
 * Purpose:
 * Organizational Units owned by Organization Parties (internal structure).
 *
 * Design rationale:
 * Units are child entities of an Organization — not separate Parties.
 * Future Build Packs reference organizational_unit_id.
 *
 * Engine:
 * ENG-003c – Organization Structure Engine
 *
 * Implementation Package:
 * BP-002 / IP-005 – Organization Structure Engine (refactored)
 */

import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { party } from "./party";
import { partyAddress } from "./party-address";

export const organizationalUnit = pgTable(
  "organizational_unit",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    organizationPartyId: uuid("organization_party_id")
      .references(() => party.id)
      .notNull(),

    parentOrganizationalUnitId: uuid("parent_organizational_unit_id"),

    unitCode: varchar("unit_code", { length: 30 }).notNull(),

    unitName: varchar("unit_name", { length: 200 }).notNull(),

    organizationalUnitTypeCode: varchar("organizational_unit_type_code", {
      length: 50,
    }).notNull(),

    isHeadOffice: boolean("is_head_office").default(false).notNull(),

    phone: varchar("phone", { length: 30 }),

    email: varchar("email", { length: 255 }),

    partyAddressId: uuid("party_address_id").references(() => partyAddress.id),

    countryCode: varchar("country_code", { length: 2 }),

    latitude: numeric("latitude", { precision: 10, scale: 7 }),

    longitude: numeric("longitude", { precision: 10, scale: 7 }),

    statusCode: varchar("status_code", { length: 50 }).notNull(),

    openingDate: date("opening_date"),

    closingDate: date("closing_date"),

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
    uniqueIndex("organizational_unit_code_uidx")
      .on(table.organizationPartyId, table.unitCode)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("organizational_unit_head_office_uidx")
      .on(table.organizationPartyId)
      .where(
        sql`${table.isHeadOffice} = true AND ${table.deletedAt} IS NULL AND ${table.statusCode} = 'ACTIVE'`
      ),
  ]
);
