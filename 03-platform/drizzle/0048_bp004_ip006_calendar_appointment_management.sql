/**
 * Purpose:
 * BP-004 / IP-06 Calendar & Appointment Management schema.
 *
 * Delivered entities:
 * - crm_appointment (scheduled customer engagement)
 * - crm_appointment_participant (internal users + external contacts)
 * - crm_appointment_entity_link (polymorphic CRM entity linkage)
 * - crm_appointment_type, crm_appointment_status (metadata catalogues)
 */

CREATE TABLE IF NOT EXISTS "crm_appointment_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"default_duration_minutes" integer DEFAULT 60 NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_appointment_type_code_uidx"
  ON "crm_appointment_type" ("code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_appointment_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"is_terminal" boolean DEFAULT false NOT NULL,
	"is_editable" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_appointment_status_code_uidx"
  ON "crm_appointment_status" ("code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_appointment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"appointment_number" varchar(40) NOT NULL,
	"appointment_type_code" varchar(50) NOT NULL,
	"subject" varchar(300) NOT NULL,
	"description" varchar(4000),
	"status_code" varchar(50) NOT NULL,
	"start_date_time" timestamp with time zone NOT NULL,
	"end_date_time" timestamp with time zone NOT NULL,
	"location" varchar(500),
	"virtual_meeting_url" varchar(1000),
	"owner_user_id" uuid NOT NULL,
	"primary_party_id" uuid NOT NULL,
	"linked_activity_id" uuid,
	"cancel_reason" varchar(500),
	"no_show_reason" varchar(500),
	"outcome_notes" varchar(2000),
	"reminder_sent_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"no_show_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_appointment_business_number_uidx"
  ON "crm_appointment" ("business_id", "appointment_number");
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'crm_appointment_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "crm_appointment"
      ADD CONSTRAINT "crm_appointment_business_id_business_id_fk"
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
      AND constraint_name = 'crm_appointment_primary_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "crm_appointment"
      ADD CONSTRAINT "crm_appointment_primary_party_id_party_id_fk"
      FOREIGN KEY ("primary_party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'crm_appointment_linked_activity_id_crm_activity_id_fk'
  ) THEN
    ALTER TABLE "crm_appointment"
      ADD CONSTRAINT "crm_appointment_linked_activity_id_crm_activity_id_fk"
      FOREIGN KEY ("linked_activity_id") REFERENCES "public"."crm_activity"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_appointment_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"participant_kind" varchar(20) NOT NULL,
	"user_id" uuid,
	"external_party_id" uuid,
	"display_name" varchar(200),
	"response_status_code" varchar(50) DEFAULT 'INVITED' NOT NULL,
	"is_organizer" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'crm_appointment_participant_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "crm_appointment_participant"
      ADD CONSTRAINT "crm_appointment_participant_business_id_business_id_fk"
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
      AND constraint_name = 'crm_appointment_participant_appointment_id_crm_appointment_id_fk'
  ) THEN
    ALTER TABLE "crm_appointment_participant"
      ADD CONSTRAINT "crm_appointment_participant_appointment_id_crm_appointment_id_fk"
      FOREIGN KEY ("appointment_id") REFERENCES "public"."crm_appointment"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'crm_appointment_participant_external_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "crm_appointment_participant"
      ADD CONSTRAINT "crm_appointment_participant_external_party_id_party_id_fk"
      FOREIGN KEY ("external_party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_appointment_entity_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
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
      AND constraint_name = 'crm_appointment_entity_link_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "crm_appointment_entity_link"
      ADD CONSTRAINT "crm_appointment_entity_link_business_id_business_id_fk"
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
      AND constraint_name = 'crm_appointment_entity_link_appointment_id_crm_appointment_id_fk'
  ) THEN
    ALTER TABLE "crm_appointment_entity_link"
      ADD CONSTRAINT "crm_appointment_entity_link_appointment_id_crm_appointment_id_fk"
      FOREIGN KEY ("appointment_id") REFERENCES "public"."crm_appointment"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
