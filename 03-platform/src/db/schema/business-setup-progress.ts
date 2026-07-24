/**
 * Purpose:
 * Track guided setup wizard progress with auditability and wizard versioning.
 *
 * WHY:
 * Owners pause/resume onboarding (BR-006, BR-009). Audit fields identify who
 * completed the last step and which wizard version produced the progress.
 *
 * RATIONALE:
 * Reuse platform_user for completed_by instead of inventing a parallel actor
 * model. wizard_version isolates future step-catalogue changes from old rows.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (A4)
 *
 * Implementation Package:
 * IP-006 – Business Activation & Configuration Wizard
 *
 * Responsibilities:
 * - Persist current/last-completed steps and completion audit metadata
 *
 * Non-Responsibilities:
 * - Step validation rules (BusinessSetupService)
 *
 * Dependencies:
 * - business, platform_user schemas
 *
 * Business Rules Implemented:
 * - BR-006 — save after each completed step
 * - BR-009 — resume from last incomplete step
 *
 * Extension Points:
 * - New wizard versions increment wizard_version without rewriting history
 */

import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { platformUser } from "./platform-user";

export const businessSetupProgress = pgTable("business_setup_progress", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull()
    .unique(),

  currentStep: varchar("current_step", { length: 50 }).notNull(),

  lastCompletedStep: varchar("last_completed_step", { length: 50 }),

  completedSteps: jsonb("completed_steps").$type<string[]>().default([]).notNull(),

  // Actor who completed the most recent step (platform_user.id).
  completedBy: uuid("completed_by").references(() => platformUser.id),

  // Timestamp of the most recent step completion.
  completedAt: timestamp("completed_at", {
    withTimezone: true,
  }),

  // Isolates progress rows created under different wizard catalogues.
  wizardVersion: varchar("wizard_version", { length: 20 }).notNull(),

  activatedAt: timestamp("activated_at", {
    withTimezone: true,
  }),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});
