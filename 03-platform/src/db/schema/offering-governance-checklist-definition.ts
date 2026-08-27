/**
 * Purpose:
 * Metadata-driven readiness checklist definitions (ENG-003l foundation).
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

import {
  boolean,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";

export const offeringGovernanceChecklistDefinition = pgTable(
  "offering_governance_checklist_definition",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id").references(() => business.id),

    code: varchar("code", { length: 80 }).notNull(),

    name: varchar("name", { length: 300 }).notNull(),

    description: varchar("description", { length: 4000 }),

    sourceModule: varchar("source_module", { length: 100 }).notNull(),

    evaluatorKey: varchar("evaluator_key", { length: 100 }).notNull(),

    isMandatory: boolean("is_mandatory").default(true).notNull(),

    weight: integer("weight").default(10).notNull(),

    displayOrder: integer("display_order").default(0).notNull(),

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
    uniqueIndex("offering_governance_checklist_business_code_uidx").on(
      table.businessId,
      table.code
    ),
  ]
);
