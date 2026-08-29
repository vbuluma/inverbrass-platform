-- BP-008 / IP-04 – Stock Transfers & Multi-Location
-- Transfer documents only. Quantity posts through inventory_movement.

CREATE TABLE IF NOT EXISTS "inventory_transfer" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "transfer_number" varchar(40) NOT NULL,
  "status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
  "source_location_id" uuid NOT NULL REFERENCES "inventory_location"("id"),
  "destination_location_id" uuid NOT NULL REFERENCES "inventory_location"("id"),
  "reason" varchar(500),
  "notes" varchar(1000),
  "requested_by" uuid,
  "requested_at" timestamptz,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "rejected_by" uuid,
  "rejected_at" timestamptz,
  "rejection_reason" varchar(1000),
  "dispatched_by" uuid,
  "dispatched_at" timestamptz,
  "received_by" uuid,
  "received_at" timestamptz,
  "completed_at" timestamptz,
  "cancelled_by" uuid,
  "cancelled_at" timestamptz,
  "cancellation_reason" varchar(1000),
  "idempotency_key" varchar(160),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "inventory_transfer_status_chk"
    CHECK (
      "status" IN (
        'DRAFT',
        'REQUESTED',
        'APPROVAL_PENDING',
        'APPROVED',
        'DISPATCHED',
        'IN_TRANSIT',
        'RECEIVED',
        'COMPLETED',
        'CANCELLED',
        'REJECTED',
        'DISCREPANCY'
      )
    ),
  CONSTRAINT "inventory_transfer_locations_chk"
    CHECK ("source_location_id" <> "destination_location_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_transfer_number_uidx"
  ON "inventory_transfer" ("business_id", "transfer_number");

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_transfer_idempotency_uidx"
  ON "inventory_transfer" ("business_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "inventory_transfer_business_status_idx"
  ON "inventory_transfer" ("business_id", "status");

CREATE INDEX IF NOT EXISTS "inventory_transfer_source_idx"
  ON "inventory_transfer" ("business_id", "source_location_id");

CREATE INDEX IF NOT EXISTS "inventory_transfer_destination_idx"
  ON "inventory_transfer" ("business_id", "destination_location_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_transfer_line" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "transfer_id" uuid NOT NULL REFERENCES "inventory_transfer"("id"),
  "line_number" numeric(10, 0) NOT NULL,
  "stock_item_id" uuid NOT NULL REFERENCES "stock_item"("id"),
  "quantity" numeric(20, 6) NOT NULL,
  "uom_id" uuid NOT NULL REFERENCES "unit_of_measure"("id"),
  "base_quantity" numeric(20, 6) NOT NULL,
  "conversion_factor" numeric(20, 6),
  "received_quantity" numeric(20, 6),
  "discrepancy_quantity" numeric(20, 6),
  "dispatch_movement_id" uuid,
  "receipt_movement_id" uuid,
  "notes" varchar(1000),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid
);

CREATE INDEX IF NOT EXISTS "inventory_transfer_line_transfer_idx"
  ON "inventory_transfer_line" ("business_id", "transfer_id");

CREATE INDEX IF NOT EXISTS "inventory_transfer_line_item_idx"
  ON "inventory_transfer_line" ("business_id", "stock_item_id");
