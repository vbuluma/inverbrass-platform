/**
 * Purpose:
 * BP-004 / IP-05 Activity & Task Management schema.
 *
 * Delivered entities:
 * - crm_activity (master activity/task record)
 * - crm_activity_entity_link (polymorphic CRM entity linkage)
 */

CREATE TABLE IF NOT EXISTS "crm_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"activity_number" varchar(40) NOT NULL,
	"activity_type_code" varchar(50) NOT NULL,
	"subject" varchar(300) NOT NULL,
	"description" varchar(4000),
	"status_code" varchar(50) NOT NULL,
	"priority_code" varchar(50) NOT NULL,
	"due_date" timestamp with time zone,
	"scheduled_start" timestamp with time zone,
	"scheduled_end" timestamp with time zone,
	"owner_user_id" uuid NOT NULL,
	"primary_party_id" uuid NOT NULL,
	"outcome_code" varchar(50),
	"outcome_notes" varchar(2000),
	"cancel_reason" varchar(500),
	"defer_reason" varchar(500),
	"deferred_until" timestamp with time zone,
	"record_source_code" varchar(50) DEFAULT 'MANUAL' NOT NULL,
	"source_reference_type" varchar(50),
	"source_reference_id" uuid,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_activity_business_number_uidx"
  ON "crm_activity" ("business_id", "activity_number");
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'crm_activity_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "crm_activity"
      ADD CONSTRAINT "crm_activity_business_id_business_id_fk"
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
      AND constraint_name = 'crm_activity_primary_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "crm_activity"
      ADD CONSTRAINT "crm_activity_primary_party_id_party_id_fk"
      FOREIGN KEY ("primary_party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_activity_entity_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"entity_type_code" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'crm_activity_entity_link_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "crm_activity_entity_link"
      ADD CONSTRAINT "crm_activity_entity_link_business_id_business_id_fk"
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
      AND constraint_name = 'crm_activity_entity_link_activity_id_crm_activity_id_fk'
  ) THEN
    ALTER TABLE "crm_activity_entity_link"
      ADD CONSTRAINT "crm_activity_entity_link_activity_id_crm_activity_id_fk"
      FOREIGN KEY ("activity_id") REFERENCES "public"."crm_activity"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
