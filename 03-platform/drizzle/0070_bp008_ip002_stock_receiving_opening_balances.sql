-- BP-008 / IP-02 – Stock Receiving & Opening Balances
-- Posts inbound stock through the IP-01 inventory_movement ledger.
-- Does not create a second stock balance, supplier bills, or GL postings.

CREATE TABLE IF NOT EXISTS "inventory_operation_control" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(80) NOT NULL,
  "name" varchar(120) NOT NULL,
  "description" varchar(500),
  "movement_type" varchar(50) NOT NULL,
  "requires_approval" boolean DEFAULT false NOT NULL,
  "over_receipt_policy" varchar(40) DEFAULT 'BLOCK' NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_operation_control_code_unique" UNIQUE ("code"),
  CONSTRAINT "inventory_operation_control_over_receipt_chk"
    CHECK ("over_receipt_policy" IN ('BLOCK', 'ALLOW_WITH_WARNING', 'ALLOW'))
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_operation_policy" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "operation_code" varchar(80) NOT NULL REFERENCES "inventory_operation_control"("code"),
  "requires_approval" boolean,
  "over_receipt_policy" varchar(40),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "inventory_operation_policy_over_receipt_chk"
    CHECK (
      "over_receipt_policy" IS NULL
      OR "over_receipt_policy" IN ('BLOCK', 'ALLOW_WITH_WARNING', 'ALLOW')
    )
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_operation_policy_business_code_uidx"
  ON "inventory_operation_policy" ("business_id", "operation_code");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_receipt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "document_number" varchar(80) NOT NULL,
  "status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
  "location_id" uuid NOT NULL REFERENCES "inventory_location"("id"),
  "supplier_party_id" uuid REFERENCES "party"("id"),
  "supplier_reference" varchar(120),
  "delivery_number" varchar(120),
  "receipt_date" timestamptz DEFAULT now() NOT NULL,
  "notes" varchar(4000),
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
  CONSTRAINT "inventory_receipt_status_chk"
    CHECK ("status" IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'REJECTED', 'CANCELLED'))
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_receipt_business_number_uidx"
  ON "inventory_receipt" ("business_id", "document_number");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "inventory_receipt_business_status_idx"
  ON "inventory_receipt" ("business_id", "status");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_receipt_line" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "receipt_id" uuid NOT NULL REFERENCES "inventory_receipt"("id"),
  "line_number" integer NOT NULL,
  "stock_item_id" uuid NOT NULL REFERENCES "stock_item"("id"),
  "quantity" numeric(20, 6) NOT NULL,
  "expected_quantity" numeric(20, 6),
  "uom_id" uuid NOT NULL REFERENCES "unit_of_measure"("id"),
  "unit_cost" numeric(20, 6),
  "line_total" numeric(20, 6),
  "currency_code" varchar(3),
  "notes" varchar(1000),
  "movement_id" uuid REFERENCES "inventory_movement"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "inventory_receipt_line_qty_chk" CHECK ("quantity" > 0),
  CONSTRAINT "inventory_receipt_line_expected_qty_chk"
    CHECK ("expected_quantity" IS NULL OR "expected_quantity" > 0)
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_receipt_line_number_uidx"
  ON "inventory_receipt_line" ("receipt_id", "line_number");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "inventory_receipt_line_receipt_idx"
  ON "inventory_receipt_line" ("business_id", "receipt_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_opening_balance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "document_number" varchar(80) NOT NULL,
  "status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
  "location_id" uuid NOT NULL REFERENCES "inventory_location"("id"),
  "opening_date" timestamptz DEFAULT now() NOT NULL,
  "notes" varchar(4000),
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
  CONSTRAINT "inventory_opening_balance_status_chk"
    CHECK ("status" IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'REJECTED', 'CANCELLED'))
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_opening_balance_business_number_uidx"
  ON "inventory_opening_balance" ("business_id", "document_number");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "inventory_opening_balance_business_status_idx"
  ON "inventory_opening_balance" ("business_id", "status");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_opening_balance_line" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "opening_balance_id" uuid NOT NULL REFERENCES "inventory_opening_balance"("id"),
  "line_number" integer NOT NULL,
  "stock_item_id" uuid NOT NULL REFERENCES "stock_item"("id"),
  "quantity" numeric(20, 6) NOT NULL,
  "uom_id" uuid NOT NULL REFERENCES "unit_of_measure"("id"),
  "unit_cost" numeric(20, 6),
  "line_total" numeric(20, 6),
  "currency_code" varchar(3),
  "notes" varchar(1000),
  "movement_id" uuid REFERENCES "inventory_movement"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "inventory_opening_balance_line_qty_chk" CHECK ("quantity" > 0)
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_opening_balance_line_number_uidx"
  ON "inventory_opening_balance_line" ("opening_balance_id", "line_number");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "inventory_opening_balance_line_header_idx"
  ON "inventory_opening_balance_line" ("business_id", "opening_balance_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_idempotency" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "idempotency_key" varchar(180) NOT NULL,
  "operation_type" varchar(60) NOT NULL,
  "resource_type" varchar(60) NOT NULL,
  "resource_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_idempotency_business_operation_key_uidx"
  ON "inventory_idempotency" ("business_id", "operation_type", "idempotency_key");

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_movement_opening_balance_uidx"
  ON "inventory_movement" ("business_id", "stock_item_id", "location_id")
  WHERE "movement_type" = 'OPENING_BALANCE';
