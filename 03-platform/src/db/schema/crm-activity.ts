/**
 * Purpose:
 * CRM Activity & Task master record — calls, meetings, visits, emails, tasks, notes.
 *
 * Design rationale:
 * Activities link to Party (required) and optional CRM entities via crm_activity_entity_link.
 * Scheduling detail for meetings lives in IP-06; visit documentation in IP-07.
 *
 * Implementation Package:
 * BP-004 / IP-05 – Activity & Task Management
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
import { party } from "./party";

export const crmActivity = pgTable(
  "crm_activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    activityNumber: varchar("activity_number", { length: 40 }).notNull(),

    activityTypeCode: varchar("activity_type_code", { length: 50 }).notNull(),

    subject: varchar("subject", { length: 300 }).notNull(),

    description: varchar("description", { length: 4000 }),

    statusCode: varchar("status_code", { length: 50 }).notNull(),

    priorityCode: varchar("priority_code", { length: 50 }).notNull(),

    dueDate: timestamp("due_date", { withTimezone: true }),

    scheduledStart: timestamp("scheduled_start", { withTimezone: true }),

    scheduledEnd: timestamp("scheduled_end", { withTimezone: true }),

    ownerUserId: uuid("owner_user_id").notNull(),

    /** Required Party context for timeline and Customer 360. */
    primaryPartyId: uuid("primary_party_id")
      .references(() => party.id)
      .notNull(),

    outcomeCode: varchar("outcome_code", { length: 50 }),

    outcomeNotes: varchar("outcome_notes", { length: 2000 }),

    cancelReason: varchar("cancel_reason", { length: 500 }),

    deferReason: varchar("defer_reason", { length: 500 }),

    deferredUntil: timestamp("deferred_until", { withTimezone: true }),

    recordSourceCode: varchar("record_source_code", { length: 50 })
      .default("MANUAL")
      .notNull(),

    sourceReferenceType: varchar("source_reference_type", { length: 50 }),

    sourceReferenceId: uuid("source_reference_id"),

    completedAt: timestamp("completed_at", { withTimezone: true }),

    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    /** Set when ACTIVITY_OVERDUE timeline event is emitted (once). */
    overdueEventEmittedAt: timestamp("overdue_event_emitted_at", {
      withTimezone: true,
    }),

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
    uniqueIndex("crm_activity_business_number_uidx").on(
      table.businessId,
      table.activityNumber
    ),
  ]
);
