/**
 * Purpose:
 * Add Branch and Business Employee tables for BP-001 setup wizard extensions.
 *
 * Why this migration exists:
 * Branch Setup and Employee Setup persist location and employment links during
 * onboarding without operational settings columns.
 */

CREATE TABLE IF NOT EXISTS "branch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(200) NOT NULL,
	"branch_type" varchar(50) NOT NULL,
	"physical_address" varchar(500) NOT NULL,
	"county" varchar(150) NOT NULL,
	"city" varchar(150) NOT NULL,
	"contact_phone" varchar(30) NOT NULL,
	"email" varchar(255),
	"gps_latitude" numeric(10, 7),
	"gps_longitude" numeric(10, 7),
	"opening_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_head_office" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'branch_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "branch"
      ADD CONSTRAINT "branch_business_id_business_id_fk"
      FOREIGN KEY ("business_id") REFERENCES "public"."business"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "branch_business_code_uidx"
  ON "branch" ("business_id", "code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_employee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"platform_user_id" uuid NOT NULL,
	"business_membership_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"job_title" varchar(150) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'business_employee_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "business_employee"
      ADD CONSTRAINT "business_employee_business_id_business_id_fk"
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
      AND constraint_name = 'business_employee_platform_user_id_platform_user_id_fk'
  ) THEN
    ALTER TABLE "business_employee"
      ADD CONSTRAINT "business_employee_platform_user_id_platform_user_id_fk"
      FOREIGN KEY ("platform_user_id") REFERENCES "public"."platform_user"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'business_employee_business_membership_id_business_membership_id_fk'
  ) THEN
    ALTER TABLE "business_employee"
      ADD CONSTRAINT "business_employee_business_membership_id_business_membership_id_fk"
      FOREIGN KEY ("business_membership_id") REFERENCES "public"."business_membership"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'business_employee_branch_id_branch_id_fk'
  ) THEN
    ALTER TABLE "business_employee"
      ADD CONSTRAINT "business_employee_branch_id_branch_id_fk"
      FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "business_employee_membership_uidx"
  ON "business_employee" ("business_membership_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "business_employee_business_user_uidx"
  ON "business_employee" ("business_id", "platform_user_id");
