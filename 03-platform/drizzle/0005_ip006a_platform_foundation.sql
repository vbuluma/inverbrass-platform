/**
 * Purpose:
 * Restore missing platform foundation tables required for BP-001 onboarding
 * and align business_type with the approved TypeScript schema (industry + icon_code).
 *
 * Why this migration exists:
 * Drizzle history marked 0000 as applied, but public.business / public.business_type
 * are absent in the live database. IP-006A requires these tables for registration
 * and business-type lookups. Industry is introduced so business types remain
 * configuration-driven.
 *
 * Implementation Package:
 * IP-006A – Platform Initialization & Security Hardening
 */

CREATE TABLE IF NOT EXISTS "industry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"icon_code" varchar(100),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "industry_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"industry_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"icon_code" varchar(100),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'business_type_industry_id_industry_id_fk'
  ) THEN
    ALTER TABLE "business_type"
      ADD CONSTRAINT "business_type_industry_id_industry_id_fk"
      FOREIGN KEY ("industry_id") REFERENCES "public"."industry"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(200) NOT NULL,
	"phone_number" varchar(30) NOT NULL,
	"business_type_id" uuid NOT NULL,
	"status_code" varchar(20) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"timezone" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_code_unique" UNIQUE("code")
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'business_business_type_id_business_type_id_fk'
  ) THEN
    ALTER TABLE "business"
      ADD CONSTRAINT "business_business_type_id_business_type_id_fk"
      FOREIGN KEY ("business_type_id") REFERENCES "public"."business_type"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'business_membership_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "business_membership"
      ADD CONSTRAINT "business_membership_business_id_business_id_fk"
      FOREIGN KEY ("business_id") REFERENCES "public"."business"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'business_profile_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "business_profile"
      ADD CONSTRAINT "business_profile_business_id_business_id_fk"
      FOREIGN KEY ("business_id") REFERENCES "public"."business"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'business_operating_currency_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "business_operating_currency"
      ADD CONSTRAINT "business_operating_currency_business_id_business_id_fk"
      FOREIGN KEY ("business_id") REFERENCES "public"."business"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'business_configuration_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "business_configuration"
      ADD CONSTRAINT "business_configuration_business_id_business_id_fk"
      FOREIGN KEY ("business_id") REFERENCES "public"."business"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'business_setup_progress_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "business_setup_progress"
      ADD CONSTRAINT "business_setup_progress_business_id_business_id_fk"
      FOREIGN KEY ("business_id") REFERENCES "public"."business"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
