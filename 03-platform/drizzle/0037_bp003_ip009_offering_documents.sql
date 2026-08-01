-- BP-003 / IP-009 – Offering Documents & Compliance
-- ENG-015 consumer storage + multi-offering link table

CREATE TABLE IF NOT EXISTS "offering_document" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "product_id" uuid NOT NULL REFERENCES "product"("id"),
  "document_type_code" varchar(50) NOT NULL,
  "storage_provider_code" varchar(50) NOT NULL,
  "storage_bucket" varchar(200) NOT NULL,
  "file_reference" varchar(1000) NOT NULL,
  "original_file_name" varchar(500) NOT NULL,
  "mime_type" varchar(150) NOT NULL,
  "file_size_bytes" bigint NOT NULL,
  "file_hash" varchar(128),
  "issue_date" date,
  "expiry_date" date,
  "status_code" varchar(50) NOT NULL,
  "is_verified" boolean DEFAULT false NOT NULL,
  "verified_by" uuid,
  "verified_at" timestamptz,
  "verification_method_code" varchar(50),
  "supersedes_document_id" uuid,
  "notes" varchar(2000),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE INDEX IF NOT EXISTS "offering_document_product_idx"
  ON "offering_document" ("business_id", "product_id")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "offering_document_link" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "offering_id" uuid NOT NULL,
  "offering_type" varchar(50) NOT NULL,
  "document_id" uuid NOT NULL REFERENCES "offering_document"("id"),
  "is_primary" boolean DEFAULT true NOT NULL,
  "effective_from" date,
  "effective_to" date,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "offering_document_link_offering_idx"
  ON "offering_document_link" ("business_id", "offering_id", "offering_type");
