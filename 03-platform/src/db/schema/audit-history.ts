/**
 * Purpose:
 * Append-only immutable audit trail for system changes.
 *
 * Design rationale:
 * Not a business timeline — records WHO changed WHAT, WHEN, FROM, TO, HOW.
 * Future Build Packs reuse AuditService.record() without duplicating logic.
 *
 * Implementation Package:
 * BP-002 / IP-011 – Enterprise Audit History
 */

import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { party } from "./party";

export const auditHistory = pgTable("audit_history", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),

  /** Party scope for workspace queries — set when the change relates to a party. */
  partyId: uuid("party_id").references(() => party.id),

  entityName: varchar("entity_name", { length: 100 }).notNull(),

  entityId: uuid("entity_id").notNull(),

  operation: varchar("operation", { length: 50 }).notNull(),

  fieldName: varchar("field_name", { length: 200 }),

  oldValue: text("old_value"),

  newValue: text("new_value"),

  changedBy: uuid("changed_by"),

  changedDateTime: timestamp("changed_date_time", { withTimezone: true })
    .notNull(),

  sourceModule: varchar("source_module", { length: 100 }).notNull(),

  correlationId: uuid("correlation_id"),

  requestId: varchar("request_id", { length: 100 }),

  ipAddress: varchar("ip_address", { length: 45 }),

  browserClient: varchar("browser_client", { length: 500 }),

  device: varchar("device", { length: 200 }),

  systemGenerated: boolean("system_generated").default(true).notNull(),

  metadata: jsonb("metadata"),

  retentionFlag: boolean("retention_flag").default(false).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
