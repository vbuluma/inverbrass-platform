/**
 * Purpose:
 * Link provisioned employees to a business, branch, and membership during setup.
 *
 * Design rationale:
 * Identity/credentials remain on platform_user + user_security_profile.
 * This table owns tenant-scoped employment attributes (job title, branch).
 *
 * Implementation Package:
 * BP-001 – Business Onboarding Enhancement & Stabilization
 */

import {
  boolean,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { branch } from "./branch";
import { business } from "./business";
import { businessMembership } from "./business-membership";
import { platformUser } from "./platform-user";

export const businessEmployee = pgTable(
  "business_employee",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    platformUserId: uuid("platform_user_id")
      .references(() => platformUser.id)
      .notNull(),

    businessMembershipId: uuid("business_membership_id")
      .references(() => businessMembership.id)
      .notNull(),

    branchId: uuid("branch_id")
      .references(() => branch.id)
      .notNull(),

    jobTitle: varchar("job_title", { length: 150 }).notNull(),

    isActive: boolean("is_active").default(true).notNull(),

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
  },
  (table) => [
    uniqueIndex("business_employee_membership_uidx").on(
      table.businessMembershipId
    ),
    uniqueIndex("business_employee_business_user_uidx").on(
      table.businessId,
      table.platformUserId
    ),
  ]
);
