-- BP-009 IP-06: award lines (IP-05 prerequisite) + purchase order domain

CREATE TABLE IF NOT EXISTS "procurement_award_line" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "award_id" uuid NOT NULL REFERENCES "procurement_award"("id"),
  "winning_quote_id" uuid NOT NULL REFERENCES "procurement_supplier_quote"("id"),
  "winning_quote_line_id" uuid REFERENCES "procurement_supplier_quote_line"("id"),
  "sequence" integer NOT NULL,
  "description" varchar(500) NOT NULL,
  "quantity" numeric(20, 6) NOT NULL,
  "uom" varchar(40) NOT NULL DEFAULT 'EA',
  "unit_price" numeric(20, 6) NOT NULL,
  "tax_rate" numeric(8, 4) NOT NULL DEFAULT '0',
  "line_total" numeric(20, 6) NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid
);

CREATE INDEX IF NOT EXISTS "procurement_award_line_award_idx"
  ON "procurement_award_line" ("award_id", "sequence");

CREATE TABLE IF NOT EXISTS "procurement_po_control" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "requires_approval" boolean DEFAULT true NOT NULL,
  "skip_rfx_enabled" boolean DEFAULT false NOT NULL,
  "skip_rfx_max_amount" numeric(20, 6),
  "material_amendment_threshold" numeric(20, 6),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_po_control_business_uidx"
  ON "procurement_po_control" ("business_id");

CREATE TABLE IF NOT EXISTS "procurement_purchase_order" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "po_number" varchar(40) NOT NULL,
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "source_type" varchar(30) NOT NULL,
  "purchase_request_id" uuid REFERENCES "procurement_purchase_request"("id"),
  "sourcing_event_id" uuid REFERENCES "procurement_sourcing_event"("id"),
  "award_id" uuid REFERENCES "procurement_award"("id"),
  "winning_quote_id" uuid REFERENCES "procurement_supplier_quote"("id"),
  "currency_code" varchar(3) NOT NULL,
  "status" varchar(30) NOT NULL DEFAULT 'DRAFT',
  "current_version_id" uuid,
  "accepted_version_id" uuid,
  "subtotal_amount" numeric(20, 6) NOT NULL DEFAULT '0',
  "tax_amount" numeric(20, 6) NOT NULL DEFAULT '0',
  "total_amount" numeric(20, 6) NOT NULL DEFAULT '0',
  "year1_amount" numeric(20, 6),
  "tcv_amount" numeric(20, 6),
  "tco_amount" numeric(20, 6),
  "delivery_location" varchar(500),
  "warranty_notes" varchar(2000),
  "terms_and_conditions" varchar(4000),
  "submitted_at" timestamp with time zone,
  "submitted_by" uuid,
  "approved_at" timestamp with time zone,
  "approved_by" uuid,
  "issued_at" timestamp with time zone,
  "issued_by" uuid,
  "accepted_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "cancelled_by" uuid,
  "cancellation_reason" varchar(2000),
  "closed_at" timestamp with time zone,
  "closed_by" uuid,
  "closure_reason" varchar(2000),
  "issue_idempotency_key" varchar(160),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_po_business_number_uidx"
  ON "procurement_purchase_order" ("business_id", "po_number");
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_po_issue_idempotency_uidx"
  ON "procurement_purchase_order" ("business_id", "issue_idempotency_key")
  WHERE "issue_idempotency_key" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "procurement_po_business_status_idx"
  ON "procurement_purchase_order" ("business_id", "status");

CREATE TABLE IF NOT EXISTS "procurement_purchase_order_version" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "purchase_order_id" uuid NOT NULL REFERENCES "procurement_purchase_order"("id"),
  "version_number" integer NOT NULL,
  "status" varchar(30) NOT NULL DEFAULT 'DRAFT',
  "subtotal_amount" numeric(20, 6) NOT NULL DEFAULT '0',
  "tax_amount" numeric(20, 6) NOT NULL DEFAULT '0',
  "total_amount" numeric(20, 6) NOT NULL DEFAULT '0',
  "year1_amount" numeric(20, 6),
  "tcv_amount" numeric(20, 6),
  "tco_amount" numeric(20, 6),
  "promised_delivery_date" date,
  "warranty_notes" varchar(2000),
  "terms_and_conditions" varchar(4000),
  "issued_at" timestamp with time zone,
  "issued_by" uuid,
  "superseded_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_po_version_uidx"
  ON "procurement_purchase_order_version" ("purchase_order_id", "version_number");

CREATE TABLE IF NOT EXISTS "procurement_purchase_order_line" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "version_id" uuid NOT NULL REFERENCES "procurement_purchase_order_version"("id"),
  "award_line_id" uuid REFERENCES "procurement_award_line"("id"),
  "quote_line_id" uuid REFERENCES "procurement_supplier_quote_line"("id"),
  "purchase_request_line_id" uuid REFERENCES "procurement_purchase_request_line"("id"),
  "catalogue_item_id" uuid,
  "sequence" integer NOT NULL,
  "description" varchar(500) NOT NULL,
  "quantity" numeric(20, 6) NOT NULL,
  "uom" varchar(40) NOT NULL DEFAULT 'EA',
  "unit_price" numeric(20, 6) NOT NULL,
  "tax_rate" numeric(8, 4) NOT NULL DEFAULT '0',
  "line_subtotal" numeric(20, 6) NOT NULL,
  "line_tax" numeric(20, 6) NOT NULL DEFAULT '0',
  "line_total" numeric(20, 6) NOT NULL,
  "promised_delivery_date" date,
  "delivery_location" varchar(500),
  "comments" varchar(2000)
);

CREATE INDEX IF NOT EXISTS "procurement_po_line_version_idx"
  ON "procurement_purchase_order_line" ("version_id", "sequence");

CREATE TABLE IF NOT EXISTS "procurement_purchase_order_payment_term" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "version_id" uuid NOT NULL REFERENCES "procurement_purchase_order_version"("id"),
  "sequence" integer NOT NULL,
  "milestone_name" varchar(200) NOT NULL,
  "percentage" numeric(8, 2) NOT NULL,
  "amount" numeric(20, 6),
  "trigger_event" varchar(200),
  "due_period_days" integer,
  "comments" varchar(1000)
);

CREATE INDEX IF NOT EXISTS "procurement_po_payment_term_version_idx"
  ON "procurement_purchase_order_payment_term" ("version_id", "sequence");

CREATE TABLE IF NOT EXISTS "procurement_po_supplier_token" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "purchase_order_id" uuid NOT NULL REFERENCES "procurement_purchase_order"("id"),
  "version_id" uuid NOT NULL REFERENCES "procurement_purchase_order_version"("id"),
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "access_token" varchar(80) NOT NULL,
  "token_expires_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_po_supplier_token_uidx"
  ON "procurement_po_supplier_token" ("access_token");

CREATE TABLE IF NOT EXISTS "procurement_po_supplier_response" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "purchase_order_id" uuid NOT NULL REFERENCES "procurement_purchase_order"("id"),
  "version_id" uuid NOT NULL REFERENCES "procurement_purchase_order_version"("id"),
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "action_type" varchar(30) NOT NULL,
  "reason" varchar(2000),
  "idempotency_key" varchar(160),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_po_supplier_response_idempotency_uidx"
  ON "procurement_po_supplier_response" ("business_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
