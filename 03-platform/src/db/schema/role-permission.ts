import {
  index,
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { role } from "./role";
import { permission } from "./permission";
import { platformUser } from "./platform-user";

export const rolePermission = pgTable(
  "role_permission",
  {
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
    grantedBy: uuid("granted_by")
      .references(() => platformUser.id),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("role_permission_role_permission_uidx").on(
      table.roleId,
      table.permissionId
    ),

    index("role_permission_role_id_idx").on(table.roleId),

    index("role_permission_permission_id_idx").on(table.permissionId),
  ]
);
