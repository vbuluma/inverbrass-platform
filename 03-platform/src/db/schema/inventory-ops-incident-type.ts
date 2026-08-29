/**
 * Purpose:
 * Platform catalogue of operational inventory incident types.
 *
 * Implementation Package:
 * BP-008 / IP-09 – Inventory Operations, Exceptions & Controls
 */

import { boolean, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const inventoryOpsIncidentType = pgTable("inventory_ops_incident_type", {
  id: uuid("id").defaultRandom().primaryKey(),

  code: varchar("code", { length: 80 }).notNull().unique(),

  name: varchar("name", { length: 120 }).notNull(),

  description: varchar("description", { length: 500 }),

  defaultSeverity: varchar("default_severity", { length: 20 }).default("MEDIUM").notNull(),

  displayOrder: integer("display_order").default(0).notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
