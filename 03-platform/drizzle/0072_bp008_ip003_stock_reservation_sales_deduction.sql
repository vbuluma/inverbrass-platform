-- BP-008 / IP-03 – Stock Reservation & Sales Deduction
-- Reservations hold available quantity without reducing on-hand.
-- Fulfilments post SALE_DEDUCTION movements through the IP-01 ledger.

CREATE TABLE IF NOT EXISTS "inventory_reservation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "document_number" varchar(80) NOT NULL,
  "status" varchar(30) DEFAULT 'REQUESTED' NOT NULL,
  "stock_item_id" uuid NOT NULL REFERENCES "stock_item"("id"),
  "location_id" uuid NOT NULL REFERENCES "inventory_location"("id"),
  "sales_order_id" varchar(80),
  "sales_order_line_id" varchar(80),
  "sales_order_number" varchar(80),
  "requested_quantity" numeric(20, 6) NOT NULL,
  "uom_id" uuid NOT NULL REFERENCES "unit_of_measure"("id"),
  "base_quantity" numeric(20, 6) NOT NULL,
  "conversion_factor" numeric(20, 6) NOT NULL,
  "reserved_quantity" numeric(20, 6) DEFAULT 0 NOT NULL,
  "fulfilled_quantity" numeric(20, 6) DEFAULT 0 NOT NULL,
  "remaining_quantity" numeric(20, 6) NOT NULL,
  "expires_at" timestamptz,
  "idempotency_key" varchar(200),
  "submitted_at" timestamptz,
  "submitted_by" uuid,
  "approved_at" timestamptz,
  "approved_by" uuid,
  "rejected_at" timestamptz,
  "rejected_by" uuid,
  "rejection_reason" varchar(1000),
  "released_at" timestamptz,
  "released_by" uuid,
  "notes" varchar(4000),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "inventory_reservation_status_chk"
    CHECK (
      "status" IN (
        'REQUESTED',
        'RESERVED',
        'PARTIALLY_FULFILLED',
        'FULFILLED',
        'REJECTED',
        'RELEASED',
        'EXPIRED'
      )
    )
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_reservation_business_number_uidx"
  ON "inventory_reservation" ("business_id", "document_number");

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_reservation_idempotency_uidx"
  ON "inventory_reservation" ("business_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_reservation_active_sale_line_uidx"
  ON "inventory_reservation" ("business_id", "sales_order_line_id")
  WHERE "sales_order_line_id" IS NOT NULL
    AND "status" IN ('REQUESTED', 'RESERVED', 'PARTIALLY_FULFILLED');

CREATE INDEX IF NOT EXISTS "inventory_reservation_business_status_idx"
  ON "inventory_reservation" ("business_id", "status");

CREATE INDEX IF NOT EXISTS "inventory_reservation_item_location_idx"
  ON "inventory_reservation" ("business_id", "stock_item_id", "location_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_fulfilment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "reservation_id" uuid NOT NULL REFERENCES "inventory_reservation"("id"),
  "fulfilment_reference" varchar(120) NOT NULL,
  "quantity" numeric(20, 6) NOT NULL,
  "base_quantity" numeric(20, 6) NOT NULL,
  "uom_id" uuid NOT NULL REFERENCES "unit_of_measure"("id"),
  "movement_id" uuid REFERENCES "inventory_movement"("id"),
  "idempotency_key" varchar(200) NOT NULL,
  "notes" varchar(1000),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_fulfilment_idempotency_uidx"
  ON "inventory_fulfilment" ("business_id", "idempotency_key");

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_fulfilment_reference_uidx"
  ON "inventory_fulfilment" ("business_id", "reservation_id", "fulfilment_reference");

CREATE INDEX IF NOT EXISTS "inventory_fulfilment_reservation_idx"
  ON "inventory_fulfilment" ("business_id", "reservation_id");
