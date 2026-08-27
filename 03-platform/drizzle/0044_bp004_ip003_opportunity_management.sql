/**
 * Purpose:
 * BP-004 / IP-03 Opportunity Management schema.
 */

CREATE TABLE IF NOT EXISTS "opportunity_pipeline" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_pipeline_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opportunity_stage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"default_probability" integer DEFAULT 0 NOT NULL,
	"is_closed_won" boolean DEFAULT false NOT NULL,
	"is_closed_lost" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opportunity_loss_reason" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_loss_reason_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_opportunity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"crm_record_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
	"source_lead_id" uuid,
	"primary_contact_party_id" uuid,
	"opportunity_number" varchar(40) NOT NULL,
	"name" varchar(200) NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"stage_code" varchar(50) NOT NULL,
	"status_code" varchar(50) NOT NULL,
	"owner_party_id" uuid,
	"branch_id" uuid,
	"expected_close_date" date,
	"amount" numeric(20, 2),
	"currency_code" varchar(3),
	"probability" integer DEFAULT 0 NOT NULL,
	"weighted_amount" numeric(20, 2),
	"loss_reason_code" varchar(50),
	"competitor_code" varchar(50),
	"close_notes" varchar(500),
	"closed_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_opportunity_line_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(20, 6) DEFAULT '1' NOT NULL,
	"unit_price" numeric(20, 6),
	"line_amount" numeric(20, 2),
	"notes" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'opportunity_stage_pipeline_id_opportunity_pipeline_id_fk'
  ) THEN
    ALTER TABLE "opportunity_stage"
      ADD CONSTRAINT "opportunity_stage_pipeline_id_opportunity_pipeline_id_fk"
      FOREIGN KEY ("pipeline_id") REFERENCES "public"."opportunity_pipeline"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_opportunity_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "crm_opportunity"
      ADD CONSTRAINT "crm_opportunity_business_id_business_id_fk"
      FOREIGN KEY ("business_id") REFERENCES "public"."business"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_opportunity_crm_record_id_crm_record_id_fk'
  ) THEN
    ALTER TABLE "crm_opportunity"
      ADD CONSTRAINT "crm_opportunity_crm_record_id_crm_record_id_fk"
      FOREIGN KEY ("crm_record_id") REFERENCES "public"."crm_record"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_opportunity_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "crm_opportunity"
      ADD CONSTRAINT "crm_opportunity_party_id_party_id_fk"
      FOREIGN KEY ("party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_opportunity_source_lead_id_crm_lead_id_fk'
  ) THEN
    ALTER TABLE "crm_opportunity"
      ADD CONSTRAINT "crm_opportunity_source_lead_id_crm_lead_id_fk"
      FOREIGN KEY ("source_lead_id") REFERENCES "public"."crm_lead"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_opportunity_pipeline_id_opportunity_pipeline_id_fk'
  ) THEN
    ALTER TABLE "crm_opportunity"
      ADD CONSTRAINT "crm_opportunity_pipeline_id_opportunity_pipeline_id_fk"
      FOREIGN KEY ("pipeline_id") REFERENCES "public"."opportunity_pipeline"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_opportunity_line_item_opportunity_id_crm_opportunity_id_fk'
  ) THEN
    ALTER TABLE "crm_opportunity_line_item"
      ADD CONSTRAINT "crm_opportunity_line_item_opportunity_id_crm_opportunity_id_fk"
      FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunity"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'crm_opportunity_line_item_product_id_product_id_fk'
  ) THEN
    ALTER TABLE "crm_opportunity_line_item"
      ADD CONSTRAINT "crm_opportunity_line_item_product_id_product_id_fk"
      FOREIGN KEY ("product_id") REFERENCES "public"."product"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_opportunity_business_number_uidx"
  ON "crm_opportunity" ("business_id", "opportunity_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_opportunity_business_status_idx"
  ON "crm_opportunity" ("business_id", "status_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_opportunity_business_party_idx"
  ON "crm_opportunity" ("business_id", "party_id");
