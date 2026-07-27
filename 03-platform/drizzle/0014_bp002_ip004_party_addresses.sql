/**
 * Purpose:
 * BP-002 / IP-004 Addresses — address_type catalogue and party_address rows.
 */

CREATE TABLE IF NOT EXISTS "address_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "address_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "party_address" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
	"address_type_code" varchar(50) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"state_province" varchar(200),
	"county_district" varchar(200),
	"city_town" varchar(200),
	"ward_locality" varchar(200),
	"postal_code" varchar(20),
	"address_line_1" varchar(500),
	"address_line_2" varchar(500),
	"landmark" varchar(500),
	"gps_latitude" numeric(10, 7),
	"gps_longitude" numeric(10, 7),
	"is_default" boolean DEFAULT false NOT NULL,
	"status_code" varchar(50) NOT NULL,
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
      AND constraint_name = 'party_address_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "party_address"
      ADD CONSTRAINT "party_address_business_id_business_id_fk"
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
      AND constraint_name = 'party_address_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "party_address"
      ADD CONSTRAINT "party_address_party_id_party_id_fk"
      FOREIGN KEY ("party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "party_address_default_per_type_uidx"
  ON "party_address" ("party_id", "address_type_code")
  WHERE "is_default" = true AND "deleted_at" IS NULL AND "status_code" = 'ACTIVE';
