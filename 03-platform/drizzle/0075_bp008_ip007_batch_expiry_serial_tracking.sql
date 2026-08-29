-- BP-008 / IP-07 – Batch, Expiry & Serial Resource Tracking
-- Traceability attributes on stock. Quantity remains on the inventory ledger.

ALTER TABLE "stock_item"
  ADD COLUMN IF NOT EXISTS "tracking_mode" varchar(20) DEFAULT 'NONE' NOT NULL;

ALTER TABLE "stock_item"
  ADD COLUMN IF NOT EXISTS "expiry_tracking_enabled" boolean DEFAULT false NOT NULL;

ALTER TABLE "stock_item"
  ADD COLUMN IF NOT EXISTS "allow_expired_fulfilment" boolean DEFAULT false NOT NULL;

ALTER TABLE "stock_item"
  DROP CONSTRAINT IF EXISTS "stock_item_tracking_mode_chk";

ALTER TABLE "stock_item"
  ADD CONSTRAINT "stock_item_tracking_mode_chk"
  CHECK ("tracking_mode" IN ('NONE', 'BATCH', 'SERIAL'));

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_lot" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "stock_item_id" uuid NOT NULL REFERENCES "stock_item"("id"),
  "lot_code" varchar(120) NOT NULL,
  "manufactured_on" date,
  "expires_on" date,
  "status" varchar(30) DEFAULT 'ACTIVE' NOT NULL,
  "notes" varchar(1000),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "inventory_lot_status_chk"
    CHECK ("status" IN ('ACTIVE', 'CLOSED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_lot_business_item_code_uidx"
  ON "inventory_lot" ("business_id", "stock_item_id", "lot_code");

CREATE INDEX IF NOT EXISTS "inventory_lot_business_item_idx"
  ON "inventory_lot" ("business_id", "stock_item_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_tracked_unit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "stock_item_id" uuid NOT NULL REFERENCES "stock_item"("id"),
  "unit_code" varchar(120) NOT NULL,
  "status" varchar(30) DEFAULT 'AVAILABLE' NOT NULL,
  "location_id" uuid REFERENCES "inventory_location"("id"),
  "expires_on" date,
  "held_source_type" varchar(40),
  "held_source_id" uuid,
  "notes" varchar(1000),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "inventory_tracked_unit_status_chk"
    CHECK (
      "status" IN (
        'AVAILABLE',
        'RESERVED',
        'SOLD',
        'DAMAGED',
        'LOST',
        'RETURNED'
      )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_tracked_unit_business_code_uidx"
  ON "inventory_tracked_unit" ("business_id", "unit_code");

CREATE INDEX IF NOT EXISTS "inventory_tracked_unit_business_item_idx"
  ON "inventory_tracked_unit" ("business_id", "stock_item_id");

CREATE INDEX IF NOT EXISTS "inventory_tracked_unit_location_idx"
  ON "inventory_tracked_unit" ("business_id", "location_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_line_trace" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "source_type" varchar(40) NOT NULL,
  "source_id" uuid NOT NULL,
  "source_line_id" uuid NOT NULL,
  "stock_item_id" uuid NOT NULL REFERENCES "stock_item"("id"),
  "lot_code" varchar(120),
  "manufactured_on" date,
  "expires_on" date,
  "unit_codes" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_line_trace_source_line_uidx"
  ON "inventory_line_trace" ("business_id", "source_type", "source_line_id");

CREATE INDEX IF NOT EXISTS "inventory_line_trace_source_idx"
  ON "inventory_line_trace" ("business_id", "source_type", "source_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_trace_allocation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "movement_id" uuid NOT NULL REFERENCES "inventory_movement"("id"),
  "stock_item_id" uuid NOT NULL REFERENCES "stock_item"("id"),
  "location_id" uuid NOT NULL REFERENCES "inventory_location"("id"),
  "lot_id" uuid REFERENCES "inventory_lot"("id"),
  "tracked_unit_id" uuid REFERENCES "inventory_tracked_unit"("id"),
  "direction" varchar(10) NOT NULL,
  "quantity" numeric(20, 6) NOT NULL,
  "source_type" varchar(40) NOT NULL,
  "source_id" uuid NOT NULL,
  "source_line_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  CONSTRAINT "inventory_trace_allocation_direction_chk"
    CHECK ("direction" IN ('IN', 'OUT'))
);

CREATE INDEX IF NOT EXISTS "inventory_trace_allocation_movement_idx"
  ON "inventory_trace_allocation" ("business_id", "movement_id");

CREATE INDEX IF NOT EXISTS "inventory_trace_allocation_lot_idx"
  ON "inventory_trace_allocation" ("business_id", "lot_id");

CREATE INDEX IF NOT EXISTS "inventory_trace_allocation_unit_idx"
  ON "inventory_trace_allocation" ("business_id", "tracked_unit_id");
