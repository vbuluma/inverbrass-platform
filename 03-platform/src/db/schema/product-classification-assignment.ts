/**
 * Purpose:
 * Many-to-many link between products and classification nodes.
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 */

import {
  boolean,
  date,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { product } from "./product";
import { productClassification } from "./product-classification";

export const productClassificationAssignment = pgTable(
  "product_classification_assignment",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    productId: uuid("product_id")
      .references(() => product.id)
      .notNull(),

    classificationId: uuid("classification_id")
      .references(() => productClassification.id)
      .notNull(),

    isPrimary: boolean("is_primary").default(false).notNull(),

    effectiveDate: date("effective_date"),

    retirementDate: date("retirement_date"),

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
    uniqueIndex("product_classification_assignment_product_class_uidx")
      .on(table.businessId, table.productId, table.classificationId)
      .where(
        sql`${table.deletedAt} IS NULL AND ${table.retirementDate} IS NULL`
      ),
  ]
);
