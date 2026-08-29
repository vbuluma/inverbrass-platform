/**
 * Purpose:
 * Business-scoped override of inventory operation controls.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import {
  boolean,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { inventoryOperationControl } from "./inventory-operation-control";

export const inventoryOperationPolicy = pgTable(
  "inventory_operation_policy",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    operationCode: varchar("operation_code", { length: 80 })
      .references(() => inventoryOperationControl.code)
      .notNull(),

    requiresApproval: boolean("requires_approval"),

    overReceiptPolicy: varchar("over_receipt_policy", { length: 40 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedBy: uuid("updated_by"),
  },
  (table) => [
    uniqueIndex("inventory_operation_policy_business_code_uidx").on(
      table.businessId,
      table.operationCode
    ),
  ]
);
