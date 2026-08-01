/**
 * Purpose:
 * Directed links between offerings with configurable relationship types.
 *
 * Implementation Package:
 * BP-003 / IP-010 – Offering Relationships
 */

import {
  date,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { product } from "./product";
import { offeringRelationshipType } from "./offering-relationship-type";

export const offeringRelationship = pgTable(
  "offering_relationship",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    sourceOfferingId: uuid("source_offering_id")
      .references(() => product.id)
      .notNull(),

    targetOfferingId: uuid("target_offering_id")
      .references(() => product.id)
      .notNull(),

    relationshipTypeId: uuid("relationship_type_id")
      .references(() => offeringRelationshipType.id)
      .notNull(),

    effectiveFrom: date("effective_from").notNull(),

    effectiveTo: date("effective_to"),

    status: varchar("status", { length: 50 }).notNull(),

    notes: varchar("notes", { length: 2000 }),

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
    uniqueIndex("offering_relationship_active_unique_uidx")
      .on(
        table.sourceOfferingId,
        table.targetOfferingId,
        table.relationshipTypeId
      )
      .where(
        sql`${table.status} = 'ACTIVE' AND ${table.deletedAt} IS NULL`
      ),
  ]
);
