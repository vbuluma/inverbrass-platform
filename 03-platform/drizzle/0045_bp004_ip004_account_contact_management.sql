/**
 * Purpose:
 * BP-004 / IP-04 Customer & Contact Management schema.
 */

CREATE TABLE IF NOT EXISTS "account_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_status_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_contact_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_contact_role_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"account_number" varchar(40) NOT NULL,
	"name" varchar(200) NOT NULL,
	"party_id" uuid,
	"crm_record_id" uuid,
	"account_type_code" varchar(50) NOT NULL,
	"status_code" varchar(50) NOT NULL,
	"parent_account_id" uuid,
	"owner_party_id" uuid,
	"branch_id" uuid,
	"segment_code" varchar(50),
	"classification_tags" jsonb,
	"notes" varchar(2000),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_account_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"contact_party_id" uuid NOT NULL,
	"role_code" varchar(50) NOT NULL,
	"influence_level" varchar(50),
	"is_primary" boolean DEFAULT false NOT NULL,
	"opportunity_id" uuid,
	"notes" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_opportunity" ADD COLUMN IF NOT EXISTS "account_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_account_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "crm_account"
      ADD CONSTRAINT "crm_account_business_id_business_id_fk"
      FOREIGN KEY ("business_id") REFERENCES "public"."business"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_account_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "crm_account"
      ADD CONSTRAINT "crm_account_party_id_party_id_fk"
      FOREIGN KEY ("party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_account_crm_record_id_crm_record_id_fk'
  ) THEN
    ALTER TABLE "crm_account"
      ADD CONSTRAINT "crm_account_crm_record_id_crm_record_id_fk"
      FOREIGN KEY ("crm_record_id") REFERENCES "public"."crm_record"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_account_parent_account_id_crm_account_id_fk'
  ) THEN
    ALTER TABLE "crm_account"
      ADD CONSTRAINT "crm_account_parent_account_id_crm_account_id_fk"
      FOREIGN KEY ("parent_account_id") REFERENCES "public"."crm_account"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_account_owner_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "crm_account"
      ADD CONSTRAINT "crm_account_owner_party_id_party_id_fk"
      FOREIGN KEY ("owner_party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_account_branch_id_branch_id_fk'
  ) THEN
    ALTER TABLE "crm_account"
      ADD CONSTRAINT "crm_account_branch_id_branch_id_fk"
      FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_account_contact_account_id_crm_account_id_fk'
  ) THEN
    ALTER TABLE "crm_account_contact"
      ADD CONSTRAINT "crm_account_contact_account_id_crm_account_id_fk"
      FOREIGN KEY ("account_id") REFERENCES "public"."crm_account"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_account_contact_contact_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "crm_account_contact"
      ADD CONSTRAINT "crm_account_contact_contact_party_id_party_id_fk"
      FOREIGN KEY ("contact_party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_account_contact_opportunity_id_crm_opportunity_id_fk'
  ) THEN
    ALTER TABLE "crm_account_contact"
      ADD CONSTRAINT "crm_account_contact_opportunity_id_crm_opportunity_id_fk"
      FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunity"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_opportunity_account_id_crm_account_id_fk'
  ) THEN
    ALTER TABLE "crm_opportunity"
      ADD CONSTRAINT "crm_opportunity_account_id_crm_account_id_fk"
      FOREIGN KEY ("account_id") REFERENCES "public"."crm_account"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_account_business_number_uidx"
  ON "crm_account" ("business_id", "account_number");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_account_business_name_uidx"
  ON "crm_account" ("business_id", "name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_account_business_status_idx"
  ON "crm_account" ("business_id", "status_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_account_business_party_idx"
  ON "crm_account" ("business_id", "party_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_account_contact_account_idx"
  ON "crm_account_contact" ("account_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_account_contact_primary_uidx"
  ON "crm_account_contact" ("account_id")
  WHERE "is_primary" = true AND "deleted_at" IS NULL;
