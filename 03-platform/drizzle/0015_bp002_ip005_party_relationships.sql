/**
 * Purpose:
 * BP-002 / IP-005 Relationships — relationship_type catalogue and party_relationship rows.
 */

CREATE TABLE IF NOT EXISTS "relationship_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "relationship_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "party_relationship" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"from_party_id" uuid NOT NULL,
	"to_party_id" uuid NOT NULL,
	"relationship_type_code" varchar(50) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
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
      AND constraint_name = 'party_relationship_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "party_relationship"
      ADD CONSTRAINT "party_relationship_business_id_business_id_fk"
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
      AND constraint_name = 'party_relationship_from_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "party_relationship"
      ADD CONSTRAINT "party_relationship_from_party_id_party_id_fk"
      FOREIGN KEY ("from_party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'party_relationship_to_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "party_relationship"
      ADD CONSTRAINT "party_relationship_to_party_id_party_id_fk"
      FOREIGN KEY ("to_party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "party_relationship_active_unique_uidx"
  ON "party_relationship" ("from_party_id", "to_party_id", "relationship_type_code")
  WHERE "status_code" = 'ACTIVE' AND "deleted_at" IS NULL;
