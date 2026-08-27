/**
 * Purpose:
 * Polymorphic entity linkage for CRM activities.
 *
 * Implementation Package:
 * BP-004 / IP-05 – Activity & Task Management
 */

import {
  boolean,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { crmActivity } from "./crm-activity";

export const crmActivityEntityLink = pgTable("crm_activity_entity_link", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),

  activityId: uuid("activity_id")
    .references(() => crmActivity.id)
    .notNull(),

  entityTypeCode: varchar("entity_type_code", { length: 50 }).notNull(),

  entityId: uuid("entity_id").notNull(),

  isPrimary: boolean("is_primary").default(false).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  createdBy: uuid("created_by"),
});
