/**
 * Purpose:
 * Party physical and postal addresses.
 *
 * Design rationale:
 * Generic administrative hierarchy fields (EDS-009) — labels come from
 * Localization later; one Default address per Address Type; soft delete.
 *
 * Implementation Package:
 * BP-002 / IP-004 – Address Management
 */

import {
  boolean,
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

export const partyAddress = pgTable(
  "party_address",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    partyId: uuid("party_id")
      .references(() => party.id)
      .notNull(),

    addressTypeCode: varchar("address_type_code", { length: 50 }).notNull(),

    countryCode: varchar("country_code", { length: 2 }).notNull(),

    stateProvince: varchar("state_province", { length: 200 }),

    countyDistrict: varchar("county_district", { length: 200 }),

    cityTown: varchar("city_town", { length: 200 }),

    wardLocality: varchar("ward_locality", { length: 200 }),

    postalCode: varchar("postal_code", { length: 20 }),

    addressLine1: varchar("address_line_1", { length: 500 }),

    addressLine2: varchar("address_line_2", { length: 500 }),

    landmark: varchar("landmark", { length: 500 }),

    gpsLatitude: numeric("gps_latitude", { precision: 10, scale: 7 }),

    gpsLongitude: numeric("gps_longitude", { precision: 10, scale: 7 }),

    isDefault: boolean("is_default").default(false).notNull(),

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
    uniqueIndex("party_address_default_per_type_uidx")
      .on(table.partyId, table.addressTypeCode)
      .where(
        sql`${table.isDefault} = true AND ${table.deletedAt} IS NULL AND ${table.statusCode} = 'ACTIVE'`
      ),
  ]
);
