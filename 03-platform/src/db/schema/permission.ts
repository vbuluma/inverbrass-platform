import {
  index,
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { permissionAction } from "./permission-action";

export const permission = pgTable(
  "permission",
  {
    // Primary Key
    id: uuid("id").defaultRandom().primaryKey(),

    // Enterprise Business Key
    code: varchar("code", { length: 150 })
      .notNull()
      .unique(),

    // Display Name
    name: varchar("name", { length: 150 })
      .notNull(),

    // Business Domain / Module
    module: varchar("module", { length: 100 })
      .notNull(),

    // Business Resource
    resource: varchar("resource", { length: 100 })
      .notNull(),

    // Permission Action
    permissionActionId: uuid("permission_action_id")
      .references(() => permissionAction.id)
      .notNull(),

    // Description
    description: varchar("description", { length: 500 }),

    // Display Order
    displayOrder: integer("display_order")
      .default(0)
      .notNull(),

    // Status
    isActive: boolean("is_active")
      .default(true)
      .notNull(),

    // Audit Fields
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
    uniqueIndex("permission_module_resource_action_uidx").on(
      table.module,
      table.resource,
      table.permissionActionId
    ),

    index("permission_action_id_idx").on(table.permissionActionId),
  ]
);
