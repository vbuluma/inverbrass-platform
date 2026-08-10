/**
 * Purpose:
 * BP-004 / IP-001 CRM Foundation schema and ENG-003n Work Assignment & SLA tables.
 */

CREATE TABLE IF NOT EXISTS "crm_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_status_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
	"customer_number" varchar(40) NOT NULL,
	"crm_type_code" varchar(50) NOT NULL,
	"status_code" varchar(50) NOT NULL,
	"owner_party_id" uuid,
	"relationship_manager_party_id" uuid,
	"branch_id" uuid,
	"source_code" varchar(50),
	"customer_since" timestamp with time zone DEFAULT now() NOT NULL,
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
      AND constraint_name = 'crm_record_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "crm_record"
      ADD CONSTRAINT "crm_record_business_id_business_id_fk"
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
      AND constraint_name = 'crm_record_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "crm_record"
      ADD CONSTRAINT "crm_record_party_id_party_id_fk"
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
      AND constraint_name = 'crm_record_owner_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "crm_record"
      ADD CONSTRAINT "crm_record_owner_party_id_party_id_fk"
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
      AND constraint_name = 'crm_record_relationship_manager_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "crm_record"
      ADD CONSTRAINT "crm_record_relationship_manager_party_id_party_id_fk"
      FOREIGN KEY ("relationship_manager_party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'crm_record_branch_id_branch_id_fk'
  ) THEN
    ALTER TABLE "crm_record"
      ADD CONSTRAINT "crm_record_branch_id_branch_id_fk"
      FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_record_business_party_uidx"
  ON "crm_record" ("business_id", "party_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_record_business_number_uidx"
  ON "crm_record" ("business_id", "customer_number");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_sla_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"target_seconds" integer NOT NULL,
	"clock_mode" varchar(50) DEFAULT 'CALENDAR' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"subject_type" varchar(100) NOT NULL,
	"subject_id" uuid NOT NULL,
	"owner_type" varchar(50) NOT NULL,
	"owner_id" uuid NOT NULL,
	"owner_party_id" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_by" uuid,
	"assignment_type" varchar(50) DEFAULT 'MANUAL' NOT NULL,
	"reason_code" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'work_assignment_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "work_assignment"
      ADD CONSTRAINT "work_assignment_business_id_business_id_fk"
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
      AND constraint_name = 'work_assignment_owner_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "work_assignment"
      ADD CONSTRAINT "work_assignment_owner_party_id_party_id_fk"
      FOREIGN KEY ("owner_party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_assignment_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"subject_type" varchar(100) NOT NULL,
	"subject_id" uuid NOT NULL,
	"previous_owner_type" varchar(50),
	"previous_owner_id" uuid,
	"previous_owner_party_id" uuid,
	"new_owner_type" varchar(50) NOT NULL,
	"new_owner_id" uuid NOT NULL,
	"new_owner_party_id" uuid,
	"assigned_by" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assignment_type" varchar(50) NOT NULL,
	"reason_code" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'work_assignment_history_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "work_assignment_history"
      ADD CONSTRAINT "work_assignment_history_business_id_business_id_fk"
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
      AND constraint_name = 'work_assignment_history_previous_owner_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "work_assignment_history"
      ADD CONSTRAINT "work_assignment_history_previous_owner_party_id_party_id_fk"
      FOREIGN KEY ("previous_owner_party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'work_assignment_history_new_owner_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "work_assignment_history"
      ADD CONSTRAINT "work_assignment_history_new_owner_party_id_party_id_fk"
      FOREIGN KEY ("new_owner_party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_sla_segment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"subject_type" varchar(100) NOT NULL,
	"subject_id" uuid NOT NULL,
	"assignee_type" varchar(50) NOT NULL,
	"assignee_id" uuid NOT NULL,
	"assignee_party_id" uuid,
	"sla_policy_id" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"active_seconds" integer DEFAULT 0 NOT NULL,
	"waiting_seconds" integer DEFAULT 0 NOT NULL,
	"paused_seconds" integer DEFAULT 0 NOT NULL,
	"breached_seconds" integer DEFAULT 0 NOT NULL,
	"is_breached" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'work_sla_segment_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "work_sla_segment"
      ADD CONSTRAINT "work_sla_segment_business_id_business_id_fk"
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
      AND constraint_name = 'work_sla_segment_assignee_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "work_sla_segment"
      ADD CONSTRAINT "work_sla_segment_assignee_party_id_party_id_fk"
      FOREIGN KEY ("assignee_party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'work_sla_segment_sla_policy_id_work_sla_policy_id_fk'
  ) THEN
    ALTER TABLE "work_sla_segment"
      ADD CONSTRAINT "work_sla_segment_sla_policy_id_work_sla_policy_id_fk"
      FOREIGN KEY ("sla_policy_id") REFERENCES "public"."work_sla_policy"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
