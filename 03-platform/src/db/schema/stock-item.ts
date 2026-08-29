/**
 * Purpose:
 * Inventory-specific stock item linked 1:0..1 to an existing BP-003 product.
 * Does not copy commercial product master data.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { business } from "./business";
import { product } from "./product";
import { unitOfMeasure } from "./unit-of-measure";

export const stockItem = pgTable(
  "stock_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),

    productId: uuid("product_id")
      .references(() => product.id)
      .notNull(),

    sku: varchar("sku", { length: 80 }).notNull(),

    barcode: varchar("barcode", { length: 120 }),

    stockTrackingEnabled: boolean("stock_tracking_enabled")
      .default(true)
      .notNull(),

    itemTypeCode: varchar("item_type_code", { length: 50 }).notNull(),

    baseUomId: uuid("base_uom_id")
      .references(() => unitOfMeasure.id)
      .notNull(),

    purchaseUomId: uuid("purchase_uom_id").references(() => unitOfMeasure.id),

    salesUomId: uuid("sales_uom_id").references(() => unitOfMeasure.id),

    conversionFactor: numeric("conversion_factor", {
      precision: 20,
      scale: 10,
    }),

    reorderLevel: numeric("reorder_level", { precision: 20, scale: 6 }),

    reorderQuantity: numeric("reorder_quantity", { precision: 20, scale: 6 }),

    minimumStockLevel: numeric("minimum_stock_level", {
      precision: 20,
      scale: 6,
    }),

    maximumStockLevel: numeric("maximum_stock_level", {
      precision: 20,
      scale: 6,
    }),

    safetyStock: numeric("safety_stock", { precision: 20, scale: 6 }),

    leadTimeDays: integer("lead_time_days"),

    reviewPeriodDays: integer("review_period_days"),

    isActive: boolean("is_active").default(true).notNull(),

    trackingMode: varchar("tracking_mode", { length: 20 }).default("NONE").notNull(),

    expiryTrackingEnabled: boolean("expiry_tracking_enabled").default(false).notNull(),

    allowExpiredFulfilment: boolean("allow_expired_fulfilment").default(false).notNull(),

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
    uniqueIndex("stock_item_business_sku_uidx")
      .on(table.businessId, table.sku)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("stock_item_business_product_active_uidx")
      .on(table.businessId, table.productId)
      .where(sql`${table.isActive} = true AND ${table.deletedAt} IS NULL`),
  ]
);
