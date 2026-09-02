/**
 * Purpose:
 * Configuration catalogues for BP-009 IP-01 procurement relationship.
 * Categories, capabilities, statuses, and qualification types are not hardcoded
 * in services — they are loaded from these tables.
 *
 * Implementation Package:
 * BP-009 / IP-01 – Procurement Foundation & Supplier Relationship
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

function catalogueTable(name: string) {
  return pgTable(name, {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    description: varchar("description", { length: 500 }),
    displayOrder: integer("display_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  });
}

export const procurementSupplierCategory = catalogueTable(
  "procurement_supplier_category"
);
export const procurementSupplierCapability = catalogueTable(
  "procurement_supplier_capability"
);
export const procurementStatus = catalogueTable("procurement_status");
export const procurementQualificationStatus = catalogueTable(
  "procurement_qualification_status"
);
export const procurementQualificationType = catalogueTable(
  "procurement_qualification_type"
);
export const procurementContractType = catalogueTable("procurement_contract_type");
