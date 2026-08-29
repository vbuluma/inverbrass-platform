/**
 * Purpose:
 * Operational inventory incidents. Quantity remains on the ledger.
 *
 * Implementation Package:
 * BP-008 / IP-09 – Inventory Operations, Exceptions & Controls
 */

import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { inventoryLocation } from "./inventory-location";
import { stockItem } from "./stock-item";

export const inventoryOpsIncident = pgTable(
  "inventory_ops_incident",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    incidentNumber: varchar("incident_number", { length: 40 }).notNull(),

    incidentType: varchar("incident_type", { length: 80 }).notNull(),

    severity: varchar("severity", { length: 20 }).notNull(),

    status: varchar("status", { length: 30 }).default("OPEN").notNull(),

    sourceType: varchar("source_type", { length: 40 }).notNull(),

    sourceId: varchar("source_id", { length: 80 }).notNull(),

    stockItemId: uuid("stock_item_id").references(() => stockItem.id),

    locationId: uuid("location_id").references(() => inventoryLocation.id),

    description: varchar("description", { length: 1000 }).notNull(),

    detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow().notNull(),

    investigationStartedAt: timestamp("investigation_started_at", { withTimezone: true }),

    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    closedAt: timestamp("closed_at", { withTimezone: true }),

    resolutionAction: varchar("resolution_action", { length: 60 }),

    resolutionReason: varchar("resolution_reason", { length: 1000 }),

    resolutionNotes: varchar("resolution_notes", { length: 1000 }),

    linkedAdjustmentId: uuid("linked_adjustment_id"),

    makerId: uuid("maker_id"),

    checkerId: uuid("checker_id"),

    idempotencyKey: varchar("idempotency_key", { length: 160 }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    createdBy: uuid("created_by"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

    updatedBy: uuid("updated_by"),
  },
  (table) => [
    uniqueIndex("inventory_ops_incident_number_uidx").on(table.businessId, table.incidentNumber),
    uniqueIndex("inventory_ops_incident_active_source_uidx")
      .on(table.businessId, table.sourceType, table.sourceId, table.incidentType)
      .where(sql`${table.status} IN ('OPEN', 'INVESTIGATING', 'APPROVAL_PENDING')`),
    uniqueIndex("inventory_ops_incident_idempotency_uidx")
      .on(table.businessId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index("inventory_ops_incident_business_status_idx").on(table.businessId, table.status),
  ]
);

export const inventoryOpsIncidentEvent = pgTable(
  "inventory_ops_incident_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    incidentId: uuid("incident_id")
      .references(() => inventoryOpsIncident.id)
      .notNull(),

    eventType: varchar("event_type", { length: 60 }).notNull(),

    note: varchar("note", { length: 1000 }),

    actorId: uuid("actor_id"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("inventory_ops_incident_event_incident_idx").on(table.businessId, table.incidentId),
  ]
);
