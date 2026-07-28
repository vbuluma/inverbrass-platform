/**
 * Purpose:
 * BP-002 / IP-007 Party Documents — document_type catalogue and party_document metadata.
 */

CREATE TABLE IF NOT EXISTS "document_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "party_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
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
	"verified_at" timestamp with time zone,
	"supersedes_document_id" uuid,
	"notes" varchar(2000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'party_document_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "party_document"
      ADD CONSTRAINT "party_document_business_id_business_id_fk"
      FOREIGN KEY ("business_id") REFERENCES "public"."business"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'party_document_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "party_document"
      ADD CONSTRAINT "party_document_party_id_party_id_fk"
      FOREIGN KEY ("party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
