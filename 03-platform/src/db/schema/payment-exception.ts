/**
 * Purpose:
 * Operational payment-exception records. Payment status remains
 * authoritative. Matching, collections, and GL are out of scope.
 *
 * Implementation Package:
 * BP-007 / IP-08 – Payment Exceptions, Operations & Controls
 */

import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { paymentObligation } from "./payment-obligation";
import { paymentTransaction } from "./payment-transaction";

export const paymentException = pgTable(
  "payment_exception",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    exceptionNumber: varchar("exception_number", { length: 80 }).notNull(),

    numberingPolicyId: uuid("numbering_policy_id").notNull(),

    paymentTransactionId: uuid("payment_transaction_id")
      .notNull()
      .references(() => paymentTransaction.id),

    paymentObligationId: uuid("payment_obligation_id")
      .notNull()
      .references(() => paymentObligation.id),

    exceptionType: varchar("exception_type", { length: 80 }).notNull(),

    severity: varchar("severity", { length: 20 }).notNull(),

    status: varchar("status", { length: 40 }).notNull(),

    reason: varchar("reason", { length: 500 }).notNull(),

    detectedAt: timestamp("detected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    detectedBy: uuid("detected_by"),

    assignedTo: uuid("assigned_to"),

    resolvedBy: uuid("resolved_by"),

    resolutionCode: varchar("resolution_code", { length: 80 }),

    resolutionNotes: varchar("resolution_notes", { length: 1000 }),

    resolutionEvidence: varchar("resolution_evidence", { length: 240 }),

    approvalStatus: varchar("approval_status", { length: 40 }),

    requestedBy: uuid("requested_by"),

    approvedBy: uuid("approved_by"),

    proposedResolutionCode: varchar("proposed_resolution_code", { length: 80 }),

    proposedResolutionNotes: varchar("proposed_resolution_notes", {
      length: 1000,
    }),

    retryOfTransactionId: uuid("retry_of_transaction_id").references(
      () => paymentTransaction.id
    ),

    idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull(),

    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedBy: uuid("updated_by"),
  },
  (table) => [
    uniqueIndex("payment_exception_business_number_uidx").on(
      table.businessId,
      table.exceptionNumber
    ),
    uniqueIndex("payment_exception_business_idempotency_uidx").on(
      table.businessId,
      table.idempotencyKey
    ),
    uniqueIndex("payment_exception_open_type_uidx")
      .on(table.businessId, table.paymentTransactionId, table.exceptionType)
      .where(sql`${table.status} in ('OPEN', 'INVESTIGATING')`),
    index("payment_exception_business_status_idx").on(
      table.businessId,
      table.status
    ),
    index("payment_exception_business_type_idx").on(
      table.businessId,
      table.exceptionType
    ),
    index("payment_exception_business_obligation_idx").on(
      table.businessId,
      table.paymentObligationId
    ),
  ]
);
