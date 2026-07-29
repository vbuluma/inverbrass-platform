/**
 * Purpose:
 * Party Communication & Consent Preferences — channels, contact preferences, consents.
 *
 * Design rationale:
 * One active profile per Party. Soft delete via deletedAt.
 * Future notification engines read this table before sending communications.
 *
 * Implementation Package:
 * BP-002 / IP-012 – Party Communication & Consent Preferences
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

export const partyCommunicationPreference = pgTable(
  "party_communication_preference",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    partyId: uuid("party_id")
      .references(() => party.id)
      .notNull(),

    preferredLanguageCode: varchar("preferred_language_code", { length: 10 }),

    preferredTimezoneCode: varchar("preferred_timezone_code", { length: 100 }),

    preferredContactMethod: varchar("preferred_contact_method", {
      length: 50,
    }),

    preferredContactTime: varchar("preferred_contact_time", { length: 50 }),

    quietHoursStart: varchar("quiet_hours_start", { length: 5 }),

    quietHoursEnd: varchar("quiet_hours_end", { length: 5 }),

    marketingConsent: boolean("marketing_consent").default(false).notNull(),

    transactionalConsent: boolean("transactional_consent")
      .default(true)
      .notNull(),

    promotionalConsent: boolean("promotional_consent")
      .default(false)
      .notNull(),

    emailEnabled: boolean("email_enabled").default(true).notNull(),

    smsEnabled: boolean("sms_enabled").default(true).notNull(),

    whatsAppEnabled: boolean("whatsapp_enabled").default(false).notNull(),

    phoneEnabled: boolean("phone_enabled").default(true).notNull(),

    pushNotificationEnabled: boolean("push_notification_enabled")
      .default(false)
      .notNull(),

    postalMailEnabled: boolean("postal_mail_enabled").default(false).notNull(),

    consentDate: timestamp("consent_date", { withTimezone: true }),

    consentSource: varchar("consent_source", { length: 100 }),

    consentVersion: varchar("consent_version", { length: 50 }),

    notes: varchar("notes", { length: 2000 }),

    statusCode: varchar("status_code", { length: 50 }).notNull(),

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
    uniqueIndex("party_communication_preference_active_uidx")
      .on(table.partyId)
      .where(
        sql`${table.deletedAt} IS NULL AND ${table.statusCode} = 'ACTIVE'`
      ),
  ]
);
