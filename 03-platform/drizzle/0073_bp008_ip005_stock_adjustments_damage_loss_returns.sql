-- BP-008 / IP-05 – Stock Adjustments, Damage, Loss & Returns
-- Posted adjustments create immutable ledger movements. On-hand is never overwritten.

CREATE TABLE IF NOT EXISTS "inventory_adjustment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "document_number" varchar(80) NOT NULL,
  "status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
  "adjustment_type" varchar(40) NOT NULL,
  "location_id" uuid NOT NULL REFERENCES "inventory_location"("id"),
  "reason" varchar(120) NOT NULL,
  "notes" varchar(4000),
  "external_reference" varchar(120),
  "origin_type" varchar(40),
  "origin_id" varchar(80),
  "origin_line_id" varchar(80),
  "idempotency_key" varchar(200),
  "submitted_at" timestamptz,
  "submitted_by" uuid,
  "approved_at" timestamptz,
  "approved_by" uuid,
  "rejected_at" timestamptz,
  "rejected_by" uuid,
  "rejection_reason" varchar(1000),
  "posted_at" timestamptz,
  "posted_by" uuid,
  "cancelled_at" timestamptz,
  "cancelled_by" uuid,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "inventory_adjustment_status_chk"
    CHECK (
      "status" IN (
        'DRAFT',
        'SUBMITTED',
        'APPROVED',
        'POSTED',
        'REJECTED',
        'CANCELLED'
      )
    ),
  CONSTRAINT "inventory_adjustment_type_chk"
    CHECK (
      "adjustment_type" IN (
        'POSITIVE_ADJUSTMENT',
        'NEGATIVE_ADJUSTMENT',
        'DAMAGE',
        'LOSS',
        'CUSTOMER_RETURN',
        'SUPPLIER_RETURN'
      )
    )
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_adjustment_business_number_uidx"
  ON "inventory_adjustment" ("business_id", "document_number");

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_adjustment_idempotency_uidx"
  ON "inventory_adjustment" ("business_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "inventory_adjustment_business_status_idx"
  ON "inventory_adjustment" ("business_id", "status");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_adjustment_line" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "adjustment_id" uuid NOT NULL REFERENCES "inventory_adjustment"("id"),
  "line_number" integer NOT NULL,
  "stock_item_id" uuid NOT NULL REFERENCES "stock_item"("id"),
  "quantity" numeric(20, 6) NOT NULL,
  "uom_id" uuid NOT NULL REFERENCES "unit_of_measure"("id"),
  "base_quantity" numeric(20, 6) NOT NULL,
  "conversion_factor" numeric(20, 6) NOT NULL,
  "condition" varchar(40) DEFAULT 'SALEABLE' NOT NULL,
  "on_hand_before" numeric(20, 6),
  "on_hand_after" numeric(20, 6),
  "movement_id" uuid REFERENCES "inventory_movement"("id"),
  "notes" varchar(1000),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_adjustment_line_number_uidx"
  ON "inventory_adjustment_line" ("adjustment_id", "line_number");

CREATE INDEX IF NOT EXISTS "inventory_adjustment_line_header_idx"
  ON "inventory_adjustment_line" ("business_id", "adjustment_id");
