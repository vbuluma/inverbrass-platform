-- BP-009 / IP-01 – Procurement Foundation & Supplier Relationship
-- Procurement relationship on BP-002 Party. Not a second supplier master.
-- No purchase requests, RFX, PO, contract, receipt, invoice, or payment tables.

CREATE TABLE IF NOT EXISTS "procurement_supplier_category" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "procurement_supplier_category_code_unique" UNIQUE ("code")
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_supplier_capability" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "procurement_supplier_capability_code_unique" UNIQUE ("code")
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_status" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "procurement_status_code_unique" UNIQUE ("code")
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_qualification_status" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "procurement_qualification_status_code_unique" UNIQUE ("code")
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_qualification_type" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "procurement_qualification_type_code_unique" UNIQUE ("code")
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_profile" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "party_id" uuid NOT NULL REFERENCES "party"("id"),
  "profile_number" varchar(40) NOT NULL,
  "status_code" varchar(50) NOT NULL,
  "qualification_status_code" varchar(50) NOT NULL,
  "is_preferred" boolean DEFAULT false NOT NULL,
  "is_approved" boolean DEFAULT false NOT NULL,
  "default_delivery_terms" varchar(200),
  "default_payment_terms" varchar(200),
  "expected_lead_time_days" integer,
  "status_reason" varchar(2000),
  "status_effective_date" date,
  "status_review_date" date,
  "status_authority" varchar(200),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_profile_business_party_uidx"
  ON "procurement_profile" ("business_id", "party_id")
  WHERE "deleted_at" IS NULL;

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_profile_business_number_uidx"
  ON "procurement_profile" ("business_id", "profile_number");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "procurement_profile_business_idx"
  ON "procurement_profile" ("business_id")
  WHERE "deleted_at" IS NULL;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_profile_category" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "category_code" varchar(50) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_profile_category_uidx"
  ON "procurement_profile_category" ("profile_id", "category_code");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_profile_capability" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "capability_code" varchar(50) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_profile_capability_uidx"
  ON "procurement_profile_capability" ("profile_id", "capability_code");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "supplier_qualification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "qualification_type_code" varchar(50) NOT NULL,
  "outcome_code" varchar(50) NOT NULL,
  "effective_date" date NOT NULL,
  "expiry_date" date,
  "review_date" date,
  "reviewer_user_id" uuid,
  "notes" varchar(4000),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "supplier_qualification_profile_idx"
  ON "supplier_qualification" ("profile_id")
  WHERE "deleted_at" IS NULL;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_qualification_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "qualification_id" uuid NOT NULL REFERENCES "supplier_qualification"("id"),
  "document_id" uuid NOT NULL REFERENCES "party_document"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_qualification_evidence_uidx"
  ON "procurement_qualification_evidence" ("qualification_id", "document_id");
