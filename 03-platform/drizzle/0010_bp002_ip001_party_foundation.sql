/**
 * Purpose:
 * BP-002 / IP-001 Party Foundation schema — reference catalogues and master Party tables.
 *
 * Delivered entities:
 * - party_type, party_status, organization_type (platform reference data)
 * - party (master repository)
 * - individual_profile, organization_profile (type-specific extensions)
 * - language catalogue delivered in 0011_bp002_ip001_language_catalogue.sql
 *
 * Industry is reused from the existing Configuration Engine catalogue.
 */

CREATE TABLE IF NOT EXISTS "party_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "party_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "party_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "party_status_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "party" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"party_number" varchar(40) NOT NULL,
	"party_type_code" varchar(50) NOT NULL,
	"display_name" varchar(300) NOT NULL,
	"status_code" varchar(50) NOT NULL,
	"notes" varchar(2000),
	"registration_date" timestamp with time zone DEFAULT now() NOT NULL,
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
      AND constraint_name = 'party_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "party"
      ADD CONSTRAINT "party_business_id_business_id_fk"
      FOREIGN KEY ("business_id") REFERENCES "public"."business"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "party_business_number_uidx"
  ON "party" ("business_id", "party_number");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "individual_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_id" uuid NOT NULL,
	"full_name" varchar(300) NOT NULL,
	"date_of_birth" date,
	"gender" varchar(50),
	"preferred_language_code" varchar(10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "individual_profile_party_id_unique" UNIQUE("party_id")
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'individual_profile_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "individual_profile"
      ADD CONSTRAINT "individual_profile_party_id_party_id_fk"
      FOREIGN KEY ("party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_id" uuid NOT NULL,
	"organization_name" varchar(300) NOT NULL,
	"registration_number" varchar(100),
	"tax_number" varchar(100),
	"industry_code" varchar(50) NOT NULL,
	"organization_type_code" varchar(50) NOT NULL,
	"website" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_profile_party_id_unique" UNIQUE("party_id")
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'organization_profile_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "organization_profile"
      ADD CONSTRAINT "organization_profile_party_id_party_id_fk"
      FOREIGN KEY ("party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
