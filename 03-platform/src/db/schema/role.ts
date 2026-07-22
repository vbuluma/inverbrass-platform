import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { business } from "./business";

export const role = pgTable(
  "role",
  {
    // Primary Key
    id: uuid("id").defaultRandom().primaryKey(),

    // Null = Platform Role (InverBrass-managed global catalog)
    // Populated = Business Role (tenant-created, scoped to one business)
    businessId: uuid("business_id").references(() => business.id),

    // true = Platform Role seeded/managed by InverBrass
    // false = Business Role created by a tenant
    isSystem: boolean("is_system").default(false).notNull(),

    // Unique Business Code
    code: varchar("code", { length: 100 }).notNull(),

    // Display Name
    name: varchar("name", { length: 150 }).notNull(),

    // Description
    description: varchar("description", { length: 500 }),

    // Display Order
    displayOrder: integer("display_order").default(0).notNull(),

    // Active Status
    isActive: boolean("is_active").default(true).notNull(),

    // Audit
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
    uniqueIndex("role_platform_code_uidx")
      .on(table.code)
      .where(sql`${table.businessId} is null`),

    uniqueIndex("role_business_code_uidx")
      .on(table.businessId, table.code)
      .where(sql`${table.businessId} is not null`),
  ]
);
