/**
 * Purpose:
 * Metadata-driven product classification hierarchy — unlimited depth, business-scoped.
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 *
 * Engine:
 * ENG-003f – Product Intelligence & Performance Engine
 */

import {
  date,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { party } from "./party";

export const productClassification = pgTable(
  "product_classification",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    parentClassificationId: uuid("parent_classification_id"),

    code: varchar("code", { length: 80 }).notNull(),

    name: varchar("name", { length: 300 }).notNull(),

    description: varchar("description", { length: 4000 }),

    classificationTypeCode: varchar("classification_type_code", { length: 50 })
      .default("CATEGORY")
      .notNull(),

    industryCode: varchar("industry_code", { length: 50 }),

    icon: varchar("icon", { length: 50 }),

    displayOrder: integer("display_order").default(0).notNull(),

    hierarchyLevel: integer("hierarchy_level").default(0).notNull(),

    status: varchar("status", { length: 50 }).notNull(),

    ownerPartyId: uuid("owner_party_id").references(() => party.id),

    businessUnit: varchar("business_unit", { length: 200 }),

    effectiveDate: date("effective_date"),

    effectiveTo: date("effective_to"),

    retirementDate: date("retirement_date"),

    approvalStatus: varchar("approval_status", { length: 50 })
      .default("NOT_REQUIRED")
      .notNull(),

    reasonForChange: varchar("reason_for_change", { length: 2000 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedBy: uuid("updated_by"),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("product_classification_business_code_uidx")
      .on(table.businessId, table.code)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
