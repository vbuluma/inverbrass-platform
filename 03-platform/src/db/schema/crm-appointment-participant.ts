/**
 * Purpose:
 * Appointment participants — internal users and external BP-002 contacts.
 *
 * Implementation Package:
 * BP-004 / IP-06 – Calendar & Appointment Management
 */

import {
  boolean,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { crmAppointment } from "./crm-appointment";
import { party } from "./party";

export const crmAppointmentParticipant = pgTable("crm_appointment_participant", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),

  appointmentId: uuid("appointment_id")
    .references(() => crmAppointment.id)
    .notNull(),

  /** INTERNAL (platform user) or EXTERNAL (BP-002 contact party). */
  participantKind: varchar("participant_kind", { length: 20 }).notNull(),

  userId: uuid("user_id"),

  externalPartyId: uuid("external_party_id").references(() => party.id),

  displayName: varchar("display_name", { length: 200 }),

  responseStatusCode: varchar("response_status_code", { length: 50 })
    .default("INVITED")
    .notNull(),

  isOrganizer: boolean("is_organizer").default(false).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  createdBy: uuid("created_by"),
});
