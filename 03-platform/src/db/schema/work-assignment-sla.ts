/**
 * Purpose:
 * ENG-003n — Work Assignment & SLA Engine persistence.
 *
 * Cross-cutting platform capability consumed by CRM and future Build Packs.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation (consumption contract)
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { party } from "./party";

export const workSlaPolicy = pgTable("work_sla_policy", {
  id: uuid("id").defaultRandom().primaryKey(),

  entityType: varchar("entity_type", { length: 100 }).notNull(),

  name: varchar("name", { length: 200 }).notNull(),

  targetSeconds: integer("target_seconds").notNull(),

  clockMode: varchar("clock_mode", { length: 50 })
    .default("CALENDAR")
    .notNull(),

  displayOrder: integer("display_order").default(0).notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const workAssignment = pgTable("work_assignment", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),

  subjectType: varchar("subject_type", { length: 100 }).notNull(),

  subjectId: uuid("subject_id").notNull(),

  ownerType: varchar("owner_type", { length: 50 }).notNull(),

  ownerId: uuid("owner_id").notNull(),

  ownerPartyId: uuid("owner_party_id").references(() => party.id),

  assignedAt: timestamp("assigned_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  assignedBy: uuid("assigned_by"),

  assignmentType: varchar("assignment_type", { length: 50 })
    .default("MANUAL")
    .notNull(),

  reasonCode: varchar("reason_code", { length: 100 }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const workAssignmentHistory = pgTable("work_assignment_history", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),

  subjectType: varchar("subject_type", { length: 100 }).notNull(),

  subjectId: uuid("subject_id").notNull(),

  previousOwnerType: varchar("previous_owner_type", { length: 50 }),

  previousOwnerId: uuid("previous_owner_id"),

  previousOwnerPartyId: uuid("previous_owner_party_id").references(
    () => party.id
  ),

  newOwnerType: varchar("new_owner_type", { length: 50 }).notNull(),

  newOwnerId: uuid("new_owner_id").notNull(),

  newOwnerPartyId: uuid("new_owner_party_id").references(() => party.id),

  assignedBy: uuid("assigned_by"),

  assignedAt: timestamp("assigned_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  assignmentType: varchar("assignment_type", { length: 50 }).notNull(),

  reasonCode: varchar("reason_code", { length: 100 }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const workSlaSegment = pgTable("work_sla_segment", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),

  subjectType: varchar("subject_type", { length: 100 }).notNull(),

  subjectId: uuid("subject_id").notNull(),

  assigneeType: varchar("assignee_type", { length: 50 }).notNull(),

  assigneeId: uuid("assignee_id").notNull(),

  assigneePartyId: uuid("assignee_party_id").references(() => party.id),

  slaPolicyId: uuid("sla_policy_id").references(() => workSlaPolicy.id),

  startedAt: timestamp("started_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  endedAt: timestamp("ended_at", { withTimezone: true }),

  activeSeconds: integer("active_seconds").default(0).notNull(),

  waitingSeconds: integer("waiting_seconds").default(0).notNull(),

  pausedSeconds: integer("paused_seconds").default(0).notNull(),

  breachedSeconds: integer("breached_seconds").default(0).notNull(),

  isBreached: boolean("is_breached").default(false).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
