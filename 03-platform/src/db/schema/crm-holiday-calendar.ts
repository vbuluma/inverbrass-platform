/**
 * Purpose:
 * CRM holiday calendar stub for SLA calculation (ENG-003n).
 *
 * Implementation Package:
 * BP-004 / IP-013 – CRM Governance & Administration
 */

import {
  boolean,
  date,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";

export const crmHolidayCalendar = pgTable(
  "crm_holiday_calendar",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    holidayDate: date("holiday_date").notNull(),

    name: varchar("name", { length: 200 }).notNull(),

    isRecurring: boolean("is_recurring").default(false).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("crm_holiday_calendar_business_date_uidx").on(
      table.businessId,
      table.holidayDate
    ),
  ]
);
