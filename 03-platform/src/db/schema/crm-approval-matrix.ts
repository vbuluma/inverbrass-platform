/**
 * Purpose:
 * CRM approval matrix stub config (ENG-005 foundation).
 *
 * Implementation Package:
 * BP-004 / IP-013 – CRM Governance & Administration
 */

import {
  boolean,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";

export const crmApprovalMatrix = pgTable(
  "crm_approval_matrix",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    actionCode: varchar("action_code", { length: 50 }).notNull(),

    minRoleCode: varchar("min_role_code", { length: 80 }).notNull(),

    requiresDualApproval: boolean("requires_dual_approval")
      .default(false)
      .notNull(),

    isActive: boolean("is_active").default(true).notNull(),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("crm_approval_matrix_business_action_uidx").on(
      table.businessId,
      table.actionCode
    ),
  ]
);
