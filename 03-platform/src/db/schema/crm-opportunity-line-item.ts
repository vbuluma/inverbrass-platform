/**
 * Purpose:
 * Opportunity offering line items referencing BP-003 products.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
 */

import {
  integer,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { crmOpportunity } from "./crm-opportunity";
import { product } from "./product";

export const crmOpportunityLineItem = pgTable("crm_opportunity_line_item", {
  id: uuid("id").defaultRandom().primaryKey(),
  opportunityId: uuid("opportunity_id")
    .references(() => crmOpportunity.id)
    .notNull(),
  productId: uuid("product_id")
    .references(() => product.id)
    .notNull(),
  quantity: numeric("quantity", { precision: 20, scale: 6 }).default("1").notNull(),
  unitPrice: numeric("unit_price", { precision: 20, scale: 6 }),
  lineAmount: numeric("line_amount", { precision: 20, scale: 2 }),
  notes: varchar("notes", { length: 500 }),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
