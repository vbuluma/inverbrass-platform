import {
    pgTable,
    uuid,
    timestamp,
  } from "drizzle-orm/pg-core";
  
  import { role } from "./role";
  import { permission } from "./permission";
  
  export const rolePermission = pgTable("role_permission", {
    // Primary Key
    id: uuid("id").defaultRandom().primaryKey(),
  
    // Role
    roleId: uuid("role_id")
      .references(() => role.id)
      .notNull(),
  
    // Permission
    permissionId: uuid("permission_id")
      .references(() => permission.id)
      .notNull(),
  
    // Audit
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  });