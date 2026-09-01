/**
 * Purpose:
 * BP-009 IP-10 procurement exception records, links, and action history.
 * Does not post inventory, GL, or execute payment.
 */

import {
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { procurementProfile } from "./procurement-profile";

export const procurementExceptionControl = pgTable(
  "procurement_exception_control",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    highSeverityRequiresApproval: boolean("high_severity_requires_approval")
      .default(true)
      .notNull(),
    duplicateInvoiceRequiresDecision: boolean("duplicate_invoice_requires_decision")
      .default(true)
      .notNull(),
    defaultSlaDays: integer("default_sla_days").default(5).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("procurement_exception_control_business_uidx").on(table.businessId)]
);

export const procurementExceptionType = pgTable(
  "procurement_exception_type",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    code: varchar("code", { length: 60 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: varchar("description", { length: 500 }),
    defaultSeverity: varchar("default_severity", { length: 20 }).default("MEDIUM").notNull(),
    requiresApprovalOnClose: boolean("requires_approval_on_close").default(false).notNull(),
    displayOrder: integer("display_order").default(100).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("procurement_exception_type_business_code_uidx").on(table.businessId, table.code),
    index("procurement_exception_type_business_active_idx").on(table.businessId, table.isActive),
  ]
);

export const procurementException = pgTable(
  "procurement_exception",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    exceptionNumber: varchar("exception_number", { length: 40 }).notNull(),
    exceptionTypeCode: varchar("exception_type_code", { length: 60 }).notNull(),
    severity: varchar("severity", { length: 20 }).notNull(),
    status: varchar("status", { length: 40 }).default("OPEN").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: varchar("description", { length: 4000 }),
    evidenceDocumentId: varchar("evidence_document_id", { length: 120 }),
    raisedFrom: varchar("raised_from", { length: 30 }).notNull(),
    sourceKey: varchar("source_key", { length: 160 }),
    profileId: uuid("profile_id").references(() => procurementProfile.id),
    ownerUserId: uuid("owner_user_id"),
    resolutionNotes: varchar("resolution_notes", { length: 4000 }),
    resolutionDecision: varchar("resolution_decision", { length: 2000 }),
    varianceAcceptedBy: uuid("variance_accepted_by"),
    requiresApproval: boolean("requires_approval").default(false).notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: uuid("cancelled_by"),
    cancellationReason: varchar("cancellation_reason", { length: 2000 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid("updated_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("procurement_exception_business_number_uidx").on(
      table.businessId,
      table.exceptionNumber
    ),
    uniqueIndex("procurement_exception_source_key_uidx")
      .on(table.businessId, table.sourceKey)
      .where(sql`${table.sourceKey} IS NOT NULL`),
    index("procurement_exception_business_status_idx").on(table.businessId, table.status),
    index("procurement_exception_owner_idx").on(table.businessId, table.ownerUserId, table.status),
  ]
);

export const procurementExceptionLink = pgTable(
  "procurement_exception_link",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    exceptionId: uuid("exception_id")
      .references(() => procurementException.id)
      .notNull(),
    objectType: varchar("object_type", { length: 40 }).notNull(),
    objectId: uuid("object_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("procurement_exception_link_exception_idx").on(table.exceptionId),
    index("procurement_exception_link_object_idx").on(table.businessId, table.objectType, table.objectId),
  ]
);

export const procurementExceptionAction = pgTable(
  "procurement_exception_action",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    exceptionId: uuid("exception_id")
      .references(() => procurementException.id)
      .notNull(),
    actionType: varchar("action_type", { length: 40 }).notNull(),
    actorUserId: uuid("actor_user_id"),
    notes: varchar("notes", { length: 4000 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("procurement_exception_action_exception_idx").on(table.exceptionId, table.createdAt)]
);
