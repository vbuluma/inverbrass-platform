-- BP-009 IP-08 Procurement Receiving & Fulfilment Handoff

ALTER TABLE "procurement_purchase_order_line"
  ADD COLUMN IF NOT EXISTS "line_type" varchar(30) DEFAULT 'INVENTORY' NOT NULL;

CREATE TABLE IF NOT EXISTS "procurement_receiving_control" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "over_receipt_policy" varchar(30) DEFAULT 'BLOCK' NOT NULL,
  "requires_supplier_acceptance" boolean DEFAULT true NOT NULL,
  "requires_receipt_confirmation" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_receiving_control_business_uidx"
  ON "procurement_receiving_control" ("business_id");

CREATE TABLE IF NOT EXISTS "procurement_receipt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "receipt_number" varchar(40) NOT NULL,
  "receipt_type" varchar(30) NOT NULL,
  "status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
  "purchase_order_id" uuid NOT NULL REFERENCES "procurement_purchase_order"("id"),
  "purchase_order_version_id" uuid NOT NULL REFERENCES "procurement_purchase_order_version"("id"),
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "receipt_date" date NOT NULL,
  "receiver_user_id" uuid,
  "delivery_location" varchar(500),
  "inspection_status" varchar(30) DEFAULT 'NOT_REQUIRED' NOT NULL,
  "inspection_notes" varchar(2000),
  "inspected_at" timestamp with time zone,
  "inspected_by" uuid,
  "service_period_start" date,
  "service_period_end" date,
  "asset_condition" varchar(80),
  "comments" varchar(4000),
  "evidence_document_id" varchar(120),
  "over_delivery_flag" boolean DEFAULT false NOT NULL,
  "submitted_at" timestamp with time zone,
  "submitted_by" uuid,
  "confirmed_at" timestamp with time zone,
  "confirmed_by" uuid,
  "rejected_at" timestamp with time zone,
  "rejected_by" uuid,
  "rejection_reason" varchar(2000),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_receipt_business_number_uidx"
  ON "procurement_receipt" ("business_id", "receipt_number");
CREATE INDEX IF NOT EXISTS "procurement_receipt_business_po_idx"
  ON "procurement_receipt" ("business_id", "purchase_order_id");
CREATE INDEX IF NOT EXISTS "procurement_receipt_business_status_idx"
  ON "procurement_receipt" ("business_id", "status");

CREATE TABLE IF NOT EXISTS "procurement_receipt_line" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "receipt_id" uuid NOT NULL REFERENCES "procurement_receipt"("id"),
  "po_line_id" uuid NOT NULL REFERENCES "procurement_purchase_order_line"("id"),
  "line_type" varchar(30) NOT NULL,
  "sequence" integer NOT NULL,
  "description" varchar(500) NOT NULL,
  "quantity_received" numeric(20, 6) NOT NULL,
  "uom" varchar(40) DEFAULT 'EA' NOT NULL,
  "catalogue_item_id" uuid,
  "stock_item_id" uuid,
  "discrepancy_type" varchar(40),
  "discrepancy_description" varchar(2000),
  "damage_flag" boolean DEFAULT false NOT NULL
);
CREATE INDEX IF NOT EXISTS "procurement_receipt_line_receipt_idx"
  ON "procurement_receipt_line" ("receipt_id", "sequence");
CREATE INDEX IF NOT EXISTS "procurement_receipt_line_po_line_idx"
  ON "procurement_receipt_line" ("po_line_id");

CREATE TABLE IF NOT EXISTS "procurement_receipt_handoff" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "receipt_id" uuid NOT NULL REFERENCES "procurement_receipt"("id"),
  "receipt_line_id" uuid NOT NULL REFERENCES "procurement_receipt_line"("id"),
  "handoff_type" varchar(30) NOT NULL,
  "status" varchar(30) DEFAULT 'PENDING' NOT NULL,
  "idempotency_key" varchar(160) NOT NULL,
  "downstream_system" varchar(40) NOT NULL,
  "downstream_reference" varchar(120),
  "error_message" varchar(2000),
  "attempted_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_receipt_handoff_idempotency_uidx"
  ON "procurement_receipt_handoff" ("business_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "procurement_receipt_handoff_receipt_idx"
  ON "procurement_receipt_handoff" ("receipt_id");
