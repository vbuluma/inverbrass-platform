/**
 * Purpose:
 * BP-002 / IP-003 Contacts — contact_type catalogue and party_contact rows.
 */

CREATE TABLE IF NOT EXISTS "contact_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "party_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
	"contact_type_code" varchar(50) NOT NULL,
	"contact_value" varchar(500) NOT NULL,
	"is_preferred" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
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
      AND constraint_name = 'party_contact_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "party_contact"
      ADD CONSTRAINT "party_contact_business_id_business_id_fk"
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
      AND constraint_name = 'party_contact_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "party_contact"
      ADD CONSTRAINT "party_contact_party_id_party_id_fk"
      FOREIGN KEY ("party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "party_contact_preferred_per_type_uidx"
  ON "party_contact" ("party_id", "contact_type_code")
  WHERE "is_preferred" = true AND "deleted_at" IS NULL AND "status_code" = 'ACTIVE';
