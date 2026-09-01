-- BP-009 IP-09 Supplier Invoice & Matching

CREATE TABLE IF NOT EXISTS "procurement_invoice_control" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "default_matching_mode" varchar(30) DEFAULT 'THREE_WAY' NOT NULL,
  "price_tolerance_percent" numeric(8, 4) DEFAULT '2' NOT NULL,
  "quantity_tolerance_percent" numeric(8, 4) DEFAULT '1' NOT NULL,
  "tax_tolerance_amount" numeric(20, 6) DEFAULT '0.01' NOT NULL,
  "duplicate_policy" varchar(30) DEFAULT 'BLOCK' NOT NULL,
  "duplicate_check_amount_date" boolean DEFAULT false NOT NULL,
  "allow_non_po_invoices" boolean DEFAULT false NOT NULL,
  "require_receipt_for_inventory" boolean DEFAULT true NOT NULL,
  "require_receipt_for_assets" boolean DEFAULT true NOT NULL,
  "require_receipt_for_services" boolean DEFAULT false NOT NULL,
  "allow_blacklisted_payment_ready" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_invoice_control_business_uidx"
  ON "procurement_invoice_control" ("business_id");

CREATE TABLE IF NOT EXISTS "procurement_supplier_invoice" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "internal_invoice_number" varchar(40) NOT NULL,
  "supplier_invoice_number" varchar(80) NOT NULL,
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "party_id" uuid NOT NULL,
  "purchase_order_id" uuid REFERENCES "procurement_purchase_order"("id"),
  "purchase_order_version_id" uuid REFERENCES "procurement_purchase_order_version"("id"),
  "invoice_date" date NOT NULL,
  "due_date" date,
  "currency_code" varchar(3) NOT NULL,
  "subtotal_amount" numeric(20, 6) NOT NULL,
  "tax_amount" numeric(20, 6) NOT NULL,
  "total_amount" numeric(20, 6) NOT NULL,
  "tax_reference" varchar(120),
  "attachment_document_id" varchar(120),
  "status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
  "match_outcome" varchar(30),
  "matching_mode" varchar(30),
  "duplicate_flag" boolean DEFAULT false NOT NULL,
  "duplicate_of_invoice_id" uuid,
  "match_version" integer DEFAULT 1 NOT NULL,
  "match_idempotency_key" varchar(160),
  "captured_at" timestamp with time zone,
  "captured_by" uuid,
  "matched_at" timestamp with time zone,
  "approved_at" timestamp with time zone,
  "approved_by" uuid,
  "payment_ready_at" timestamp with time zone,
  "rejected_at" timestamp with time zone,
  "rejected_by" uuid,
  "rejection_reason" varchar(2000),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_supplier_invoice_business_internal_uidx"
  ON "procurement_supplier_invoice" ("business_id", "internal_invoice_number");
CREATE INDEX IF NOT EXISTS "procurement_supplier_invoice_business_status_idx"
  ON "procurement_supplier_invoice" ("business_id", "status");
CREATE INDEX IF NOT EXISTS "procurement_supplier_invoice_business_po_idx"
  ON "procurement_supplier_invoice" ("business_id", "purchase_order_id");
CREATE INDEX IF NOT EXISTS "procurement_supplier_invoice_supplier_number_idx"
  ON "procurement_supplier_invoice" ("business_id", "profile_id", "supplier_invoice_number");

CREATE TABLE IF NOT EXISTS "procurement_supplier_invoice_line" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "invoice_id" uuid NOT NULL REFERENCES "procurement_supplier_invoice"("id"),
  "po_line_id" uuid REFERENCES "procurement_purchase_order_line"("id"),
  "sequence" integer NOT NULL,
  "description" varchar(500) NOT NULL,
  "quantity" numeric(20, 6) NOT NULL,
  "uom" varchar(40) DEFAULT 'EA' NOT NULL,
  "unit_price" numeric(20, 6) NOT NULL,
  "tax_rate" numeric(8, 4) DEFAULT '0' NOT NULL,
  "line_subtotal" numeric(20, 6) NOT NULL,
  "line_tax" numeric(20, 6) NOT NULL,
  "line_total" numeric(20, 6) NOT NULL,
  "tax_reference" varchar(120)
);
CREATE INDEX IF NOT EXISTS "procurement_supplier_invoice_line_invoice_idx"
  ON "procurement_supplier_invoice_line" ("invoice_id", "sequence");
CREATE INDEX IF NOT EXISTS "procurement_supplier_invoice_line_po_line_idx"
  ON "procurement_supplier_invoice_line" ("po_line_id");

CREATE TABLE IF NOT EXISTS "procurement_invoice_match" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "invoice_id" uuid NOT NULL REFERENCES "procurement_supplier_invoice"("id"),
  "matching_mode" varchar(30) NOT NULL,
  "outcome" varchar(30) NOT NULL,
  "idempotency_key" varchar(160) NOT NULL,
  "price_variance_amount" numeric(20, 6) DEFAULT '0' NOT NULL,
  "quantity_variance_amount" numeric(20, 6) DEFAULT '0' NOT NULL,
  "tax_variance_amount" numeric(20, 6) DEFAULT '0' NOT NULL,
  "summary" varchar(4000),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_invoice_match_idempotency_uidx"
  ON "procurement_invoice_match" ("business_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "procurement_invoice_match_invoice_idx"
  ON "procurement_invoice_match" ("invoice_id");

CREATE TABLE IF NOT EXISTS "procurement_invoice_match_line" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "match_id" uuid NOT NULL REFERENCES "procurement_invoice_match"("id"),
  "invoice_line_id" uuid NOT NULL REFERENCES "procurement_supplier_invoice_line"("id"),
  "po_line_id" uuid REFERENCES "procurement_purchase_order_line"("id"),
  "receipt_line_id" uuid REFERENCES "procurement_receipt_line"("id"),
  "po_quantity" numeric(20, 6),
  "receipt_quantity" numeric(20, 6),
  "invoice_quantity" numeric(20, 6) NOT NULL,
  "po_amount" numeric(20, 6),
  "invoice_amount" numeric(20, 6) NOT NULL,
  "variance_type" varchar(40),
  "variance_amount" numeric(20, 6),
  "within_tolerance" boolean DEFAULT false NOT NULL
);
CREATE INDEX IF NOT EXISTS "procurement_invoice_match_line_match_idx"
  ON "procurement_invoice_match_line" ("match_id");

CREATE TABLE IF NOT EXISTS "procurement_ap_handoff" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "invoice_id" uuid NOT NULL REFERENCES "procurement_supplier_invoice"("id"),
  "status" varchar(30) DEFAULT 'PENDING' NOT NULL,
  "payee_party_id" uuid NOT NULL,
  "amount" numeric(20, 6) NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "due_date" date,
  "purchase_order_id" uuid REFERENCES "procurement_purchase_order"("id"),
  "supplier_invoice_number" varchar(80) NOT NULL,
  "internal_invoice_number" varchar(40) NOT NULL,
  "downstream_system" varchar(40) DEFAULT 'AP' NOT NULL,
  "downstream_reference" varchar(120),
  "idempotency_key" varchar(160) NOT NULL,
  "error_message" varchar(2000),
  "attempted_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_ap_handoff_idempotency_uidx"
  ON "procurement_ap_handoff" ("business_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "procurement_ap_handoff_invoice_idx"
  ON "procurement_ap_handoff" ("invoice_id");
