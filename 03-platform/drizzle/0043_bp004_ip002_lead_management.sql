/**
 * Purpose:
 * BP-004 / IP-02 Lead Management schema.
 */

CREATE TABLE IF NOT EXISTS "lead_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_status_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_source_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_disqualification_reason" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_disqualification_reason_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_lead" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
	"lead_number" varchar(40) NOT NULL,
	"status_code" varchar(50) NOT NULL,
	"source_code" varchar(50) NOT NULL,
	"channel_code" varchar(50),
	"owner_party_id" uuid,
	"branch_id" uuid,
	"company_name" varchar(200),
	"contact_name" varchar(200),
	"email" varchar(255),
	"phone" varchar(50),
	"qualification_score" integer,
	"converted_crm_id" uuid,
	"converted_at" timestamp with time zone,
	"disqualification_reason_code" varchar(50),
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'crm_lead_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "crm_lead"
      ADD CONSTRAINT "crm_lead_business_id_business_id_fk"
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
      AND constraint_name = 'crm_lead_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "crm_lead"
      ADD CONSTRAINT "crm_lead_party_id_party_id_fk"
      FOREIGN KEY ("party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'crm_lead_owner_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "crm_lead"
      ADD CONSTRAINT "crm_lead_owner_party_id_party_id_fk"
      FOREIGN KEY ("owner_party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'crm_lead_branch_id_branch_id_fk'
  ) THEN
    ALTER TABLE "crm_lead"
      ADD CONSTRAINT "crm_lead_branch_id_branch_id_fk"
      FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'crm_lead_converted_crm_id_crm_record_id_fk'
  ) THEN
    ALTER TABLE "crm_lead"
      ADD CONSTRAINT "crm_lead_converted_crm_id_crm_record_id_fk"
      FOREIGN KEY ("converted_crm_id") REFERENCES "public"."crm_record"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_lead_business_number_uidx"
  ON "crm_lead" ("business_id", "lead_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_lead_business_party_idx"
  ON "crm_lead" ("business_id", "party_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_lead_business_status_idx"
  ON "crm_lead" ("business_id", "status_code");
