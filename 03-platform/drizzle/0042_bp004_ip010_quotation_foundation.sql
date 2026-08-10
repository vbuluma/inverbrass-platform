-- BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.1 Foundation)
-- Quotation header, version, and line item tables

CREATE TABLE IF NOT EXISTS "quotation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "quotation_number" varchar(80) NOT NULL,
  "crm_record_id" uuid,
  "party_id" uuid NOT NULL REFERENCES "party"("id"),
  "account_id" uuid,
  "opportunity_id" uuid,
  "status" varchar(50) NOT NULL,
  "currency_code" varchar(3) NOT NULL REFERENCES "currency"("code"),
  "pricing_catalogue_id" uuid REFERENCES "pricing_catalogue"("id"),
  "customer_segment" varchar(100),
  "sales_channel" varchar(100),
  "region" varchar(100),
  "valid_until" timestamptz,
  "current_version_number" integer DEFAULT 1 NOT NULL,
  "owner_user_id" uuid,
  "notes" varchar(4000),
  "terms_template_code" varchar(100),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "quotation_business_number_uidx"
  ON "quotation" ("business_id", "quotation_number")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "quotation_business_status_idx"
  ON "quotation" ("business_id", "status")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "quotation_business_party_idx"
  ON "quotation" ("business_id", "party_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "quotation_business_opportunity_idx"
  ON "quotation" ("business_id", "opportunity_id")
  WHERE "deleted_at" IS NULL AND "opportunity_id" IS NOT NULL;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "quotation_version" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "quotation_id" uuid NOT NULL REFERENCES "quotation"("id"),
  "version_number" integer NOT NULL,
  "status" varchar(50) NOT NULL,
  "subtotal" numeric(20, 6) DEFAULT 0 NOT NULL,
  "tax_amount" numeric(20, 6) DEFAULT 0 NOT NULL,
  "grand_total" numeric(20, 6) DEFAULT 0 NOT NULL,
  "revision_reason" varchar(500),
  "sent_at" timestamptz,
  "locked_at" timestamptz,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "quotation_version_quotation_number_uidx"
  ON "quotation_version" ("quotation_id", "version_number");

CREATE INDEX IF NOT EXISTS "quotation_version_business_quotation_idx"
  ON "quotation_version" ("business_id", "quotation_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "quotation_line" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "quotation_version_id" uuid NOT NULL REFERENCES "quotation_version"("id"),
  "line_number" integer NOT NULL,
  "offering_id" uuid NOT NULL REFERENCES "product"("id"),
  "offering_variant_id" uuid,
  "description" varchar(1000),
  "quantity" numeric(20, 6) NOT NULL,
  "unit_of_measure_id" uuid REFERENCES "unit_of_measure"("id"),
  "unit_price" numeric(20, 6) NOT NULL,
  "pricing_item_id" uuid REFERENCES "pricing_item"("id"),
  "line_total" numeric(20, 6) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "quotation_line_version_line_uidx"
  ON "quotation_line" ("quotation_version_id", "line_number");

CREATE INDEX IF NOT EXISTS "quotation_line_business_offering_idx"
  ON "quotation_line" ("business_id", "offering_id");
