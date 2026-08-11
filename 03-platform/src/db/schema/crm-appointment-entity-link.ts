/**
 * Purpose:
 * Polymorphic CRM entity linkage for appointments.
 *
 * Implementation Package:
 * BP-004 / IP-06 – Calendar & Appointment Management
 */

import { boolean, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { business } from "./business";
import { crmAppointment } from "./crm-appointment";

export const crmAppointmentEntityLink = pgTable("crm_appointment_entity_link", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),

  appointmentId: uuid("appointment_id")
    .references(() => crmAppointment.id)
    .notNull(),

  entityTypeCode: varchar("entity_type_code", { length: 50 }).notNull(),

  entityId: uuid("entity_id").notNull(),

  isPrimary: boolean("is_primary").default(false).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  createdBy: uuid("created_by"),
});
