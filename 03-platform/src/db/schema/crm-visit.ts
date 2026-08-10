/**
 * CRM Visit master — collaborative call reports (IP-07).
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
import { crmAppointment } from "./crm-appointment";
import { party } from "./party";

export const crmVisit = pgTable(
  "crm_visit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    visitNumber: varchar("visit_number", { length: 40 }).notNull(),
    visitTypeCode: varchar("visit_type_code", { length: 50 }).notNull(),
    subject: varchar("subject", { length: 300 }).notNull(),
    statusCode: varchar("status_code", { length: 50 }).notNull(),
    visitDate: timestamp("visit_date", { withTimezone: true }).notNull(),
    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),
    location: varchar("location", { length: 500 }),
    gpsLatitude: varchar("gps_latitude", { length: 40 }),
    gpsLongitude: varchar("gps_longitude", { length: 40 }),
    objectives: varchar("objectives", { length: 4000 }),
    agenda: varchar("agenda", { length: 4000 }),
    priorityCode: varchar("priority_code", { length: 50 }).default("NORMAL").notNull(),
    ownerUserId: uuid("owner_user_id").notNull(),
    primaryPartyId: uuid("primary_party_id")
      .references(() => party.id)
      .notNull(),
    linkedAppointmentId: uuid("linked_appointment_id").references(
      () => crmAppointment.id
    ),
    linkedActivityId: uuid("linked_activity_id").references(() => crmActivity.id),
    discussion: varchar("discussion", { length: 8000 }),
    decisions: varchar("decisions", { length: 4000 }),
    risks: varchar("risks", { length: 4000 }),
    nextSteps: varchar("next_steps", { length: 4000 }),
    minutesSummary: varchar("minutes_summary", { length: 8000 }),
    submitterNotes: varchar("submitter_notes", { length: 2000 }),
    reviewerComments: varchar("reviewer_comments", { length: 2000 }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    reportDueAt: timestamp("report_due_at", { withTimezone: true }),
    slaBreachedAt: timestamp("sla_breached_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid("updated_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("crm_visit_business_number_uidx").on(
      table.businessId,
      table.visitNumber
    ),
  ]
);
