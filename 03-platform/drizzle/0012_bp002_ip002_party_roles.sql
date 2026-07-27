/**
 * Purpose:
 * BP-002 / IP-002 Party Roles — role_type catalogue and party_role assignments.
 *
 * Distinct from IAM `role` / `user_role` tables.
 */

CREATE TABLE IF NOT EXISTS "role_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "party_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
	"role_type_code" varchar(50) NOT NULL,
	"status_code" varchar(50) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"effective_date" date NOT NULL,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'party_role_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "party_role"
      ADD CONSTRAINT "party_role_business_id_business_id_fk"
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
      AND constraint_name = 'party_role_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "party_role"
      ADD CONSTRAINT "party_role_party_id_party_id_fk"
      FOREIGN KEY ("party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "party_role_active_unique_uidx"
  ON "party_role" ("party_id", "role_type_code")
  WHERE "status_code" = 'ACTIVE';
