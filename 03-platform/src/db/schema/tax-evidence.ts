/**
 * Purpose:
 * Evidence attachments for tax obligations (file references only).
 *
 * Implementation Package:
 * BP-005 / IP-11 – Tax Compliance, Remittance & Evidence Management
 */

import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { taxObligation } from "./tax-obligation";

export const taxEvidence = pgTable(
  "tax_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => taxObligation.id),

    evidenceType: varchar("evidence_type", { length: 80 }).notNull(),

    /** File storage reference only — not binary content. */
    documentRef: varchar("document_ref", { length: 500 }).notNull(),

    uploadedBy: uuid("uploaded_by"),

    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    description: text("description"),

    periodKey: varchar("period_key", { length: 40 }),

    status: varchar("status", { length: 40 }).notNull(),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("tax_evidence_business_idx").on(table.businessId),
    index("tax_evidence_obligation_idx").on(table.obligationId),
  ]
);
