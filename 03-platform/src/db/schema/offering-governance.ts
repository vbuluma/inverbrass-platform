/**
 * Purpose:
 * Business-scoped offering governance master record.
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { party } from "./party";
import { product } from "./product";

export const offeringGovernance = pgTable(
  "offering_governance",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id),

    offeringId: uuid("offering_id")
      .notNull()
      .references(() => product.id),

    responsibleBusinessOwnerPartyId: uuid(
      "responsible_business_owner_party_id"
    ).references(() => party.id),

    technicalOwnerPartyId: uuid("technical_owner_party_id").references(
      () => party.id
    ),

    productStewardPartyId: uuid("product_steward_party_id").references(
      () => party.id
    ),

    governanceStatus: varchar("governance_status", { length: 80 }).notNull(),

    readinessScore: numeric("readiness_score", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),

    lastValidationDate: timestamp("last_validation_date", {
      withTimezone: true,
    }),

    isLocked: boolean("is_locked").default(false).notNull(),

    notes: varchar("notes", { length: 4000 }),

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
    uniqueIndex("offering_governance_business_offering_uidx")
      .on(table.businessId, table.offeringId)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
