/**
 * Purpose:
 * Append-only tax compliance domain event history.
 * Complements ENG-013 audit_history — does not replace it.
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

export const taxComplianceEvent = pgTable(
  "tax_compliance_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    obligationId: uuid("obligation_id").references(() => taxObligation.id),

    entityType: varchar("entity_type", { length: 80 }).notNull(),

    entityId: uuid("entity_id").notNull(),

    eventType: varchar("event_type", { length: 80 }).notNull(),

    actorUserId: uuid("actor_user_id"),

    beforeStatus: varchar("before_status", { length: 40 }),

    afterStatus: varchar("after_status", { length: 40 }),

    reason: text("reason"),

    metadata: jsonb("metadata"),

    performedAt: timestamp("performed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("tax_compliance_event_business_idx").on(table.businessId),
    index("tax_compliance_event_obligation_idx").on(table.obligationId),
  ]
);
