import { integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { business } from "./business";
import { crmActivity } from "./crm-activity";
import { crmVisit } from "./crm-visit";

export const crmVisitActionItem = pgTable("crm_visit_action_item", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),
  visitId: uuid("visit_id")
    .references(() => crmVisit.id)
    .notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: varchar("description", { length: 2000 }),
  ownerUserId: uuid("owner_user_id").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  priorityCode: varchar("priority_code", { length: 50 }).default("NORMAL").notNull(),
  statusCode: varchar("status_code", { length: 50 }).default("OPEN").notNull(),
  linkedActivityId: uuid("linked_activity_id").references(() => crmActivity.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid("updated_by"),
});
