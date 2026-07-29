/**
 * Event-driven consent capture — immutable consent event records.
 *
 * Consent originates from channel events (Website, WhatsApp, Branch, etc.)
 * and updates Party Communication Preferences via Consent Engine.
 */

import {
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { party } from "./party";

export const partyConsentEvent = pgTable("party_consent_event", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),

  partyId: uuid("party_id")
    .references(() => party.id)
    .notNull(),

  /** MARKETING | TRANSACTIONAL | PROMOTIONAL */
  consentTypeCode: varchar("consent_type_code", { length: 50 }).notNull(),

  /** GRANTED | REVOKED | PENDING */
  statusCode: varchar("status_code", { length: 50 }).notNull(),

  consentDate: timestamp("consent_date", { withTimezone: true }).notNull(),

  /** Reference to consent_source.code */
  consentSourceCode: varchar("consent_source_code", { length: 80 }).notNull(),

  capturedBy: uuid("captured_by"),

  /** Channel-specific evidence — message ID, call recording ID, etc. */
  evidence: varchar("evidence", { length: 500 }),

  ipAddress: varchar("ip_address", { length: 45 }),

  browser: varchar("browser", { length: 200 }),

  device: varchar("device", { length: 200 }),

  referenceId: varchar("reference_id", { length: 200 }),

  notes: varchar("notes", { length: 2000 }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
