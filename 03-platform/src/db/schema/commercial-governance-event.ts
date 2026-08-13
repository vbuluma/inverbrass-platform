/**
 * Purpose:
 * Append-only commercial governance event history (domain journal).
 * Complements ENG-013 audit_history — does not replace it.
 *
 * Implementation Package:
 * BP-005 / IP-08 – Commercial Governance
 */

import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { commercialRuleVersion } from "./commercial-rule-version";

export const commercialGovernanceEvent = pgTable(
  "commercial_governance_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    ruleVersionId: uuid("rule_version_id")
      .notNull()
      .references(() => commercialRuleVersion.id),

    eventType: varchar("event_type", { length: 80 }).notNull(),

    actorUserId: uuid("actor_user_id"),

    beforeStatus: varchar("before_status", { length: 40 }),
    afterStatus: varchar("after_status", { length: 40 }),

    beforePayload: jsonb("before_payload"),
    afterPayload: jsonb("after_payload"),

    reason: text("reason"),

    approvalStatus: varchar("approval_status", { length: 40 }),

    metadata: jsonb("metadata"),

    performedAt: timestamp("performed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  }
);
