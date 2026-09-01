-- BP-009 / IP-02 – Purchase Requests & Procurement Approval
-- Controlled purchase request + ENG-005 approval. Not RFX, PO, budget ledger, or inventory.

CREATE TABLE IF NOT EXISTS "procurement_request_control" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "requires_approval" boolean DEFAULT true NOT NULL,
  "over_budget_mode" varchar(40) DEFAULT 'BLOCK' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_request_control_business_uidx"
  ON "procurement_request_control" ("business_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_purchase_request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "request_number" varchar(40) NOT NULL,
  "status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
  "origin_type" varchar(40) NOT NULL,
  "origin_reference" varchar(200),
  "requester_user_id" uuid,
  "business_unit_code" varchar(100),
  "procurement_type" varchar(40) NOT NULL,
  "justification" varchar(4000),
  "required_date" date,
  "delivery_location" varchar(500),
  "estimated_value" numeric(20, 6) NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "budget_source" varchar(40) NOT NULL,
  "budget_reference" varchar(200),
  "budget_line" varchar(200),
  "budget_period" varchar(40),
  "budget_approved_amount" numeric(20, 6),
  "budget_available_amount" numeric(20, 6),
  "budget_check_status" varchar(40) NOT NULL,
  "budget_approval_reference" varchar(200),
  "budget_approval_date" date,
  "budget_approver" varchar(200),
  "suggested_profile_id" uuid REFERENCES "procurement_profile"("id"),
  "submitted_at" timestamptz,
  "submitted_by" uuid,
  "approved_at" timestamptz,
  "approved_by" uuid,
  "rejected_at" timestamptz,
  "rejected_by" uuid,
  "returned_at" timestamptz,
  "returned_by" uuid,
  "cancelled_at" timestamptz,
  "cancelled_by" uuid,
  "decision_reason" varchar(2000),
  "idempotency_key" varchar(160),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_pr_business_number_uidx"
  ON "procurement_purchase_request" ("business_id", "request_number");

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_pr_idempotency_uidx"
  ON "procurement_purchase_request" ("business_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "procurement_pr_business_status_idx"
  ON "procurement_purchase_request" ("business_id", "status");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_purchase_request_line" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "request_id" uuid NOT NULL REFERENCES "procurement_purchase_request"("id"),
  "line_number" integer NOT NULL,
  "catalogue_item_id" uuid,
  "description" varchar(500) NOT NULL,
  "specification" varchar(4000),
  "quantity" numeric(20, 6) NOT NULL,
  "uom" varchar(40) NOT NULL,
  "estimated_value" numeric(20, 6) NOT NULL,
  "required_date" date,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "procurement_pr_line_request_idx"
  ON "procurement_purchase_request_line" ("business_id", "request_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_request_document" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "request_id" uuid NOT NULL REFERENCES "procurement_purchase_request"("id"),
  "document_type_code" varchar(50) NOT NULL,
  "original_file_name" varchar(500) NOT NULL,
  "storage_reference" varchar(1000) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "procurement_pr_document_request_idx"
  ON "procurement_request_document" ("business_id", "request_id");
