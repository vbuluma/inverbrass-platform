/**
 * Purpose:
 * CRM master record — extends Party with customer relationship context.
 *
 * Design rationale:
 * One CRM record per Party per business. Party identity is never duplicated.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import {
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { branch } from "./branch";
import { business } from "./business";
import { party } from "./party";

export const crmRecord = pgTable(
  "crm_record",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    partyId: uuid("party_id")
      .references(() => party.id)
      .notNull(),

    customerNumber: varchar("customer_number", { length: 40 }).notNull(),

    crmTypeCode: varchar("crm_type_code", { length: 50 }).notNull(),

    statusCode: varchar("status_code", { length: 50 }).notNull(),

    ownerPartyId: uuid("owner_party_id").references(() => party.id),

    relationshipManagerPartyId: uuid("relationship_manager_party_id").references(
      () => party.id
    ),

    branchId: uuid("branch_id").references(() => branch.id),

    sourceCode: varchar("source_code", { length: 50 }),

    customerSince: timestamp("customer_since", { withTimezone: true })
      .defaultNow()
      .notNull(),

    recordSource: varchar("record_source", { length: 50 })
      .default("PLATFORM_CREATED")
      .notNull(),

    legacyCode: varchar("legacy_code", { length: 100 }),

    legacySystem: varchar("legacy_system", { length: 100 }),

    migrationDate: timestamp("migration_date", { withTimezone: true }),

    migrationBatch: varchar("migration_batch", { length: 100 }),

    metadata: jsonb("metadata"),

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
    uniqueIndex("crm_record_business_party_uidx").on(
      table.businessId,
      table.partyId
    ),
    uniqueIndex("crm_record_business_number_uidx").on(
      table.businessId,
      table.customerNumber
    ),
  ]
);
