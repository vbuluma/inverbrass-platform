/**
 * Purpose:
 * CRM business hours calendar stub for SLA calculation (ENG-003n).
 *
 * Implementation Package:
 * BP-004 / IP-013 – CRM Governance & Administration
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

import { business } from "./business";

export const crmBusinessHours = pgTable(
  "crm_business_hours",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    dayOfWeek: integer("day_of_week").notNull(),

    openTime: varchar("open_time", { length: 5 }).notNull(),

    closeTime: varchar("close_time", { length: 5 }).notNull(),

    isClosed: boolean("is_closed").default(false).notNull(),

    timezone: varchar("timezone", { length: 80 }).default("UTC").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("crm_business_hours_business_day_uidx").on(
      table.businessId,
      table.dayOfWeek
    ),
  ]
);
