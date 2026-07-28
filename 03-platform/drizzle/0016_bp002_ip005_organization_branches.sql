/**
 * Purpose:
 * BP-002 / IP-005 Organization Branches — branch_type catalogue and organization_branch rows.
 */

CREATE TABLE IF NOT EXISTS "branch_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_branch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"organization_party_id" uuid NOT NULL,
	"branch_code" varchar(30) NOT NULL,
	"branch_name" varchar(200) NOT NULL,
	"branch_type_code" varchar(50) NOT NULL,
	"parent_branch_id" uuid,
	"is_head_office" boolean DEFAULT false NOT NULL,
	"phone" varchar(30),
	"email" varchar(255),
	"party_address_id" uuid,
	"status_code" varchar(50) NOT NULL,
	"opening_date" date,
	"closing_date" date,
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
      AND constraint_name = 'organization_branch_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "organization_branch"
      ADD CONSTRAINT "organization_branch_business_id_business_id_fk"
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
      AND constraint_name = 'organization_branch_organization_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "organization_branch"
      ADD CONSTRAINT "organization_branch_organization_party_id_party_id_fk"
      FOREIGN KEY ("organization_party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'organization_branch_party_address_id_party_address_id_fk'
  ) THEN
    ALTER TABLE "organization_branch"
      ADD CONSTRAINT "organization_branch_party_address_id_party_address_id_fk"
      FOREIGN KEY ("party_address_id") REFERENCES "public"."party_address"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'organization_branch_parent_branch_id_organization_branch_id_fk'
  ) THEN
    ALTER TABLE "organization_branch"
      ADD CONSTRAINT "organization_branch_parent_branch_id_organization_branch_id_fk"
      FOREIGN KEY ("parent_branch_id") REFERENCES "public"."organization_branch"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_branch_code_uidx"
  ON "organization_branch" ("organization_party_id", "branch_code")
  WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_branch_head_office_uidx"
  ON "organization_branch" ("organization_party_id")
  WHERE "is_head_office" = true AND "deleted_at" IS NULL AND "status_code" = 'ACTIVE';
