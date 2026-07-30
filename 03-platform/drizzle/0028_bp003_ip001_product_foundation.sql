/**
 * Purpose:
 * BP-003 / IP-001 Product Foundation schema — reference catalogues and master Product table.
 *
 * Delivered entities:
 * - product_type, product_status (platform reference data)
 * - product (master repository)
 * - product_timeline (append-only activity feed)
 */

CREATE TABLE IF NOT EXISTS "product_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_status_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"product_code" varchar(80) NOT NULL,
	"product_name" varchar(300) NOT NULL,
	"short_name" varchar(100),
	"description" varchar(4000),
	"product_type_code" varchar(50) NOT NULL,
	"status_code" varchar(50) NOT NULL,
	"owner_party_id" uuid,
	"default_currency" varchar(3),
	"launch_date" date,
	"retirement_date" date,
	"is_sellable" boolean DEFAULT false NOT NULL,
	"is_purchasable" boolean DEFAULT false NOT NULL,
	"is_bookable" boolean DEFAULT false NOT NULL,
	"is_rentable" boolean DEFAULT false NOT NULL,
	"is_subscription" boolean DEFAULT false NOT NULL,
	"is_digital" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"record_source" varchar(50) DEFAULT 'PLATFORM_CREATED' NOT NULL,
	"legacy_code" varchar(100),
	"legacy_system" varchar(100),
	"migration_date" timestamp with time zone,
	"migration_batch" varchar(100),
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
      AND constraint_name = 'product_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "product"
      ADD CONSTRAINT "product_business_id_business_id_fk"
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
      AND constraint_name = 'product_owner_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "product"
      ADD CONSTRAINT "product_owner_party_id_party_id_fk"
      FOREIGN KEY ("owner_party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_business_code_uidx"
  ON "product" ("business_id", "product_code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_timeline" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"event_date_time" timestamp with time zone NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"event_category" varchar(50) NOT NULL,
	"source_module" varchar(100) NOT NULL,
	"reference_entity" varchar(100),
	"reference_id" uuid,
	"summary" varchar(500) NOT NULL,
	"description" varchar(4000),
	"performed_by_user_id" uuid,
	"performed_by_name" varchar(200),
	"visibility" varchar(50) NOT NULL,
	"system_generated" boolean DEFAULT true NOT NULL,
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
      AND constraint_name = 'product_timeline_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "product_timeline"
      ADD CONSTRAINT "product_timeline_business_id_business_id_fk"
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
      AND constraint_name = 'product_timeline_product_id_product_id_fk'
  ) THEN
    ALTER TABLE "product_timeline"
      ADD CONSTRAINT "product_timeline_product_id_product_id_fk"
      FOREIGN KEY ("product_id") REFERENCES "public"."product"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_timeline_product_feed_idx"
  ON "product_timeline" ("business_id", "product_id", "event_date_time" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_timeline_category_idx"
  ON "product_timeline" ("business_id", "product_id", "event_category");
