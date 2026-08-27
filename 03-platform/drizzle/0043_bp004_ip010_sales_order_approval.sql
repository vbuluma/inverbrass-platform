-- BP-004 / IP-10 – Sales order handoff, approval, and document snapshot

ALTER TABLE "quotation"
  ADD COLUMN IF NOT EXISTS "approval_status" varchar(50) DEFAULT 'NOT_REQUIRED' NOT NULL,
  ADD COLUMN IF NOT EXISTS "approved_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "approved_by" uuid,
  ADD COLUMN IF NOT EXISTS "document_snapshot" jsonb;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "sales_order" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "order_number" varchar(80) NOT NULL,
  "quotation_id" uuid NOT NULL REFERENCES "quotation"("id"),
  "quotation_version_id" uuid REFERENCES "quotation_version"("id"),
  "crm_record_id" uuid,
  "party_id" uuid NOT NULL REFERENCES "party"("id"),
  "account_id" uuid,
  "opportunity_id" uuid,
  "status" varchar(50) NOT NULL,
  "currency_code" varchar(3) NOT NULL REFERENCES "currency"("code"),
  "subtotal" numeric(20, 6) DEFAULT 0 NOT NULL,
  "tax_amount" numeric(20, 6) DEFAULT 0 NOT NULL,
  "grand_total" numeric(20, 6) DEFAULT 0 NOT NULL,
  "handoff_status" varchar(50) DEFAULT 'PENDING' NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "sales_order_business_number_uidx"
  ON "sales_order" ("business_id", "order_number");

CREATE INDEX IF NOT EXISTS "sales_order_quotation_idx"
  ON "sales_order" ("quotation_id");

CREATE INDEX IF NOT EXISTS "sales_order_opportunity_idx"
  ON "sales_order" ("business_id", "opportunity_id")
  WHERE "opportunity_id" IS NOT NULL;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "sales_order_line" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "sales_order_id" uuid NOT NULL REFERENCES "sales_order"("id"),
  "line_number" integer NOT NULL,
  "offering_id" uuid NOT NULL REFERENCES "product"("id"),
  "offering_variant_id" uuid,
  "description" varchar(1000),
  "quantity" numeric(20, 6) NOT NULL,
  "unit_price" numeric(20, 6) NOT NULL,
  "line_total" numeric(20, 6) NOT NULL,
  "quotation_line_id" uuid REFERENCES "quotation_line"("id"),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "sales_order_line_order_line_uidx"
  ON "sales_order_line" ("sales_order_id", "line_number");
