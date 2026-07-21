import {
    pgTable,
    uuid,
    timestamp,
    varchar,
  } from "drizzle-orm/pg-core";
  
  import { businessMembership } from "./business-membership";
  import { role } from "./role";
  import { platformUser } from "./platform-user";
  
  export const userRole = pgTable("user_role", {
    // Primary Key
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),
  
    // Business Membership
    businessMembershipId: uuid("business_membership_id")
      .references(() => businessMembership.id)
      .notNull(),
  
    // Assigned Role
    roleId: uuid("role_id")
      .references(() => role.id)
      .notNull(),
  
    // Assignment Validity
    effectiveFrom: timestamp("effective_from", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  
    effectiveTo: timestamp("effective_to", {
      withTimezone: true,
    }),
  
    // Audit
    assignedBy: uuid("assigned_by")
      .references(() => platformUser.id),
    
    assignmentReason: varchar("assignment_reason", {
      length: 500,
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