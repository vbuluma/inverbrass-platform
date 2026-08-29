-- BP-008 / IP-08 – Reorder & Inventory Controls
-- Control settings extend the existing item/location master.
-- Recommendations do not store a second stock quantity ledger.

ALTER TABLE "stock_item"
  ADD COLUMN IF NOT EXISTS "safety_stock" numeric(20, 6);

ALTER TABLE "stock_item"
  ADD COLUMN IF NOT EXISTS "lead_time_days" integer;

ALTER TABLE "stock_item"
  ADD COLUMN IF NOT EXISTS "review_period_days" integer;

ALTER TABLE "stock_item_location"
  ADD COLUMN IF NOT EXISTS "reorder_quantity_override" numeric(20, 6);

ALTER TABLE "stock_item_location"
  ADD COLUMN IF NOT EXISTS "safety_stock_override" numeric(20, 6);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_replenishment_advice" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "stock_item_id" uuid NOT NULL REFERENCES "stock_item"("id"),
  "location_id" uuid NOT NULL REFERENCES "inventory_location"("id"),
  "advice_number" varchar(40) NOT NULL,
  "condition_code" varchar(40) NOT NULL,
  "status" varchar(30) DEFAULT 'OPEN' NOT NULL,
  "on_hand" numeric(20, 6) NOT NULL,
  "reserved" numeric(20, 6) NOT NULL,
  "available" numeric(20, 6) NOT NULL,
  "saleable_available" numeric(20, 6) NOT NULL,
  "threshold_quantity" numeric(20, 6),
  "recommended_quantity" numeric(20, 6) NOT NULL,
  "reason" varchar(1000),
  "acknowledged_at" timestamptz,
  "acknowledged_by" uuid,
  "closed_at" timestamptz,
  "closed_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "inventory_replenishment_advice_status_chk"
    CHECK ("status" IN ('OPEN', 'ACKNOWLEDGED', 'CLOSED')),
  CONSTRAINT "inventory_replenishment_advice_condition_chk"
    CHECK ("condition_code" IN ('REORDER_REQUIRED', 'OUT_OF_STOCK', 'LOW_STOCK', 'OVERSTOCK'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_replenishment_advice_number_uidx"
  ON "inventory_replenishment_advice" ("business_id", "advice_number");

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_replenishment_advice_open_uidx"
  ON "inventory_replenishment_advice" (
    "business_id",
    "stock_item_id",
    "location_id",
    "condition_code"
  )
  WHERE "status" IN ('OPEN', 'ACKNOWLEDGED');

CREATE INDEX IF NOT EXISTS "inventory_replenishment_advice_business_status_idx"
  ON "inventory_replenishment_advice" ("business_id", "status");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_control_change" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "stock_item_id" uuid NOT NULL REFERENCES "stock_item"("id"),
  "location_id" uuid REFERENCES "inventory_location"("id"),
  "status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
  "previous_settings" jsonb,
  "proposed_settings" jsonb NOT NULL,
  "submitted_by" uuid,
  "submitted_at" timestamptz,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "review_reason" varchar(1000),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "inventory_control_change_status_chk"
    CHECK ("status" IN ('DRAFT', 'APPROVAL_PENDING', 'APPROVED', 'REJECTED'))
);

CREATE INDEX IF NOT EXISTS "inventory_control_change_business_item_idx"
  ON "inventory_control_change" ("business_id", "stock_item_id", "status");
