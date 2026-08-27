/**
 * Purpose:
 * ENG-003b numbering policy for financial documents (invoice, later receipt).
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";

export const documentNumberingPolicy = pgTable(
  "document_numbering_policy",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id").references(() => business.id),

    documentType: varchar("document_type", { length: 40 }).notNull(),

    policyCode: varchar("policy_code", { length: 80 }).notNull(),

    prefix: varchar("prefix", { length: 20 }).notNull(),

    nextValue: integer("next_value").default(0).notNull(),

    padding: integer("padding").default(6).notNull(),

    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("document_numbering_policy_code_uidx").on(table.policyCode),
  ]
);
