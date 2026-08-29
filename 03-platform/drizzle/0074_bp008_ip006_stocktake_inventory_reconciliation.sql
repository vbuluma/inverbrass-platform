-- BP-008 / IP-06 – Stocktake & Inventory Reconciliation
-- Physical counts compare to a frozen snapshot. Variances post through IP-05 adjustments.

CREATE TABLE IF NOT EXISTS "inventory_stocktake" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "document_number" varchar(80) NOT NULL,
  "status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
  "location_id" uuid NOT NULL REFERENCES "inventory_location"("id"),
  "scope_type" varchar(40) NOT NULL,
  "scope_group" varchar(80),
  "counted_on" timestamptz,
  "notes" varchar(4000),
  "idempotency_key" varchar(200),
  "started_at" timestamptz,
  "started_by" uuid,
  "submitted_at" timestamptz,
  "submitted_by" uuid,
  "approved_at" timestamptz,
  "approved_by" uuid,
  "rejected_at" timestamptz,
  "rejected_by" uuid,
  "rejection_reason" varchar(1000),
  "posted_at" timestamptz,
  "posted_by" uuid,
  "completed_at" timestamptz,
  "completed_by" uuid,
  "cancelled_at" timestamptz,
  "cancelled_by" uuid,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "inventory_stocktake_status_chk"
    CHECK (
      "status" IN (
        'DRAFT',
        'IN_PROGRESS',
        'SUBMITTED',
        'APPROVAL_PENDING',
        'APPROVED',
        'POSTED',
        'COMPLETED',
        'REJECTED',
        'CANCELLED'
      )
    ),
  CONSTRAINT "inventory_stocktake_scope_chk"
    CHECK (
      "scope_type" IN ('LOCATION', 'ITEM', 'GROUP')
    )
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_stocktake_business_number_uidx"
  ON "inventory_stocktake" ("business_id", "document_number");

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_stocktake_idempotency_uidx"
  ON "inventory_stocktake" ("business_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "inventory_stocktake_business_status_idx"
  ON "inventory_stocktake" ("business_id", "status");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_stocktake_line" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "stocktake_id" uuid NOT NULL REFERENCES "inventory_stocktake"("id"),
  "line_number" integer NOT NULL,
  "stock_item_id" uuid NOT NULL REFERENCES "stock_item"("id"),
  "location_id" uuid NOT NULL REFERENCES "inventory_location"("id"),
  "snapshot_quantity" numeric(20, 6) NOT NULL,
  "snapshot_taken_at" timestamptz NOT NULL,
  "counted_quantity" numeric(20, 6),
  "counted_uom_id" uuid REFERENCES "unit_of_measure"("id"),
  "counted_base_quantity" numeric(20, 6),
  "conversion_factor" numeric(20, 6),
  "variance_quantity" numeric(20, 6),
  "variance_class" varchar(20),
  "count_status" varchar(30) DEFAULT 'PENDING' NOT NULL,
  "adjustment_id" uuid REFERENCES "inventory_adjustment"("id"),
  "movement_id" uuid REFERENCES "inventory_movement"("id"),
  "notes" varchar(1000),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_stocktake_line_number_uidx"
  ON "inventory_stocktake_line" ("stocktake_id", "line_number");

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_stocktake_line_item_uidx"
  ON "inventory_stocktake_line" ("stocktake_id", "stock_item_id");

CREATE INDEX IF NOT EXISTS "inventory_stocktake_line_header_idx"
  ON "inventory_stocktake_line" ("business_id", "stocktake_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_stocktake_count" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "line_id" uuid NOT NULL REFERENCES "inventory_stocktake_line"("id"),
  "sequence" integer NOT NULL,
  "entered_quantity" numeric(20, 6) NOT NULL,
  "uom_id" uuid NOT NULL REFERENCES "unit_of_measure"("id"),
  "base_quantity" numeric(20, 6) NOT NULL,
  "conversion_factor" numeric(20, 6) NOT NULL,
  "is_recount" boolean DEFAULT false NOT NULL,
  "counted_at" timestamptz DEFAULT now() NOT NULL,
  "counted_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_stocktake_count_sequence_uidx"
  ON "inventory_stocktake_count" ("line_id", "sequence");

CREATE INDEX IF NOT EXISTS "inventory_stocktake_count_line_idx"
  ON "inventory_stocktake_count" ("business_id", "line_id");
