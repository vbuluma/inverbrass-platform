/**
 * Purpose:
 * Extension table for Catalogue Structure relationships (IP-012 prep).
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
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
import { productClassification } from "./product-classification";

export const productClassificationRelationship = pgTable(
  "product_classification_relationship",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    sourceClassificationId: uuid("source_classification_id")
      .references(() => productClassification.id)
      .notNull(),

    targetClassificationId: uuid("target_classification_id")
      .references(() => productClassification.id)
      .notNull(),

    relationshipTypeCode: varchar("relationship_type_code", {
      length: 50,
    }).notNull(),

    status: varchar("status", { length: 50 }).default("ACTIVE").notNull(),

    effectiveDate: date("effective_date"),

    retirementDate: date("retirement_date"),

    notes: varchar("notes", { length: 2000 }),

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
    uniqueIndex("product_classification_relationship_uidx")
      .on(
        table.businessId,
        table.sourceClassificationId,
        table.targetClassificationId,
        table.relationshipTypeCode
      )
      .where(
        sql`${table.deletedAt} IS NULL AND ${table.retirementDate} IS NULL`
      ),
  ]
);
