/**
 * Purpose:
 * Configurable Appointment Status catalogue (metadata-driven).
 *
 * Implementation Package:
 * BP-004 / IP-06 – Calendar & Appointment Management
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const crmAppointmentStatus = pgTable("crm_appointment_status", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }),
  isTerminal: boolean("is_terminal").default(false).notNull(),
  isEditable: boolean("is_editable").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
