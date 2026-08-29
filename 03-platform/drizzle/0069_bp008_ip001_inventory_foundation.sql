-- BP-008 / IP-01 – Inventory Foundation & Stock Item Master
-- Reuses BP-003 product master and unit_of_measure. Does not create a second product catalogue.
-- Opening stock is the only movement type recorded in this package.

CREATE TABLE IF NOT EXISTS "stock_item_type" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "stock_item_type_code_unique" UNIQUE ("code")
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_location_type" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_location_type_code_unique" UNIQUE ("code")
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_location" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "code" varchar(80) NOT NULL,
  "name" varchar(300) NOT NULL,
  "description" varchar(4000),
  "location_type_code" varchar(50) NOT NULL,
  "parent_location_id" uuid,
  "is_active" boolean DEFAULT true NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "inventory_location_parent_fk"
    FOREIGN KEY ("parent_location_id") REFERENCES "inventory_location"("id")
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_location_business_code_uidx"
  ON "inventory_location" ("business_id", "code")
  WHERE "deleted_at" IS NULL;

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "inventory_location_business_idx"
  ON "inventory_location" ("business_id")
  WHERE "deleted_at" IS NULL;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "stock_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "product_id" uuid NOT NULL REFERENCES "product"("id"),
  "sku" varchar(80) NOT NULL,
  "barcode" varchar(120),
  "stock_tracking_enabled" boolean DEFAULT true NOT NULL,
  "item_type_code" varchar(50) NOT NULL,
  "base_uom_id" uuid NOT NULL REFERENCES "unit_of_measure"("id"),
  "purchase_uom_id" uuid REFERENCES "unit_of_measure"("id"),
  "sales_uom_id" uuid REFERENCES "unit_of_measure"("id"),
  "conversion_factor" numeric(20, 10),
  "reorder_level" numeric(20, 6),
  "reorder_quantity" numeric(20, 6),
  "minimum_stock_level" numeric(20, 6),
  "maximum_stock_level" numeric(20, 6),
  "is_active" boolean DEFAULT true NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "stock_item_business_sku_uidx"
  ON "stock_item" ("business_id", "sku")
  WHERE "deleted_at" IS NULL;

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "stock_item_business_product_active_uidx"
  ON "stock_item" ("business_id", "product_id")
  WHERE "is_active" = true AND "deleted_at" IS NULL;

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "stock_item_business_idx"
  ON "stock_item" ("business_id")
  WHERE "deleted_at" IS NULL;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "stock_item_location" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "stock_item_id" uuid NOT NULL REFERENCES "stock_item"("id"),
  "location_id" uuid NOT NULL REFERENCES "inventory_location"("id"),
  "is_active" boolean DEFAULT true NOT NULL,
  "reorder_level_override" numeric(20, 6),
  "minimum_stock_level_override" numeric(20, 6),
  "maximum_stock_level_override" numeric(20, 6),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "stock_item_location_item_loc_uidx"
  ON "stock_item_location" ("stock_item_id", "location_id")
  WHERE "deleted_at" IS NULL;

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "stock_item_location_business_idx"
  ON "stock_item_location" ("business_id")
  WHERE "deleted_at" IS NULL;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_movement" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "stock_item_id" uuid NOT NULL REFERENCES "stock_item"("id"),
  "location_id" uuid NOT NULL REFERENCES "inventory_location"("id"),
  "movement_type" varchar(50) NOT NULL,
  "quantity" numeric(20, 6) NOT NULL,
  "uom_id" uuid NOT NULL REFERENCES "unit_of_measure"("id"),
  "reason" varchar(500),
  "occurred_at" timestamptz DEFAULT now() NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_movement_opening_uidx"
  ON "inventory_movement" ("business_id", "stock_item_id", "location_id")
  WHERE "movement_type" = 'OPENING_STOCK';

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "inventory_movement_business_idx"
  ON "inventory_movement" ("business_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_balance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "stock_item_id" uuid NOT NULL REFERENCES "stock_item"("id"),
  "location_id" uuid NOT NULL REFERENCES "inventory_location"("id"),
  "on_hand" numeric(20, 6) DEFAULT '0' NOT NULL,
  "reserved" numeric(20, 6) DEFAULT '0' NOT NULL,
  "available" numeric(20, 6) DEFAULT '0' NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_balance_item_location_uidx"
  ON "inventory_balance" ("business_id", "stock_item_id", "location_id");
