/**
 * Purpose:
 * CRM Appointment master record — scheduled customer meetings and visits.
 *
 * Design rationale:
 * Time-boxed scheduling detail; completion spawns IP-05 activity.
 *
 * Implementation Package:
 * BP-004 / IP-06 – Calendar & Appointment Management
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
import { crmActivity } from "./crm-activity";
import { party } from "./party";

export const crmAppointment = pgTable(
  "crm_appointment",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    appointmentNumber: varchar("appointment_number", { length: 40 }).notNull(),

    appointmentTypeCode: varchar("appointment_type_code", { length: 50 }).notNull(),

    subject: varchar("subject", { length: 300 }).notNull(),

    description: varchar("description", { length: 4000 }),

    statusCode: varchar("status_code", { length: 50 }).notNull(),

    startDateTime: timestamp("start_date_time", { withTimezone: true }).notNull(),

    endDateTime: timestamp("end_date_time", { withTimezone: true }).notNull(),

    location: varchar("location", { length: 500 }),

    virtualMeetingUrl: varchar("virtual_meeting_url", { length: 1000 }),

    ownerUserId: uuid("owner_user_id").notNull(),

    primaryPartyId: uuid("primary_party_id")
      .references(() => party.id)
      .notNull(),

    linkedActivityId: uuid("linked_activity_id").references(() => crmActivity.id),

    cancelReason: varchar("cancel_reason", { length: 500 }),

    noShowReason: varchar("no_show_reason", { length: 500 }),

    outcomeNotes: varchar("outcome_notes", { length: 2000 }),

    /** Lightweight minutes (IP-06) — full collaborative reports live in IP-07. */
    meetingNotes: varchar("meeting_notes", { length: 8000 }),

    decisions: varchar("decisions", { length: 4000 }),

    actionItemsSummary: varchar("action_items_summary", { length: 4000 }),

    /** Future recurrence: FK to crm_appointment_recurrence_rule (not yet created). */
    recurrenceRuleId: uuid("recurrence_rule_id"),

    occurrenceIndex: integer("occurrence_index"),

    /** Outlook / Google / ICS sync key — extension point for external calendars. */
    externalCalendarSyncKey: varchar("external_calendar_sync_key", { length: 200 }),

    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),

    completedAt: timestamp("completed_at", { withTimezone: true }),

    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    noShowAt: timestamp("no_show_at", { withTimezone: true }),

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
    uniqueIndex("crm_appointment_business_number_uidx").on(
      table.businessId,
      table.appointmentNumber
    ),
  ]
);
