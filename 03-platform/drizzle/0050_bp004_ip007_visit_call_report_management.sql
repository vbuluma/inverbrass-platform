/**
 * Purpose:
 * BP-004 / IP-07 Visit & Call Report Management schema.
 */

CREATE TABLE IF NOT EXISTS "crm_visit_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_visit_type_code_uidx" ON "crm_visit_type" ("code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_visit_status" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "crm_visit_status_code_uidx" ON "crm_visit_status" ("code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_visit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"visit_number" varchar(40) NOT NULL,
	"visit_type_code" varchar(50) NOT NULL,
	"subject" varchar(300) NOT NULL,
	"status_code" varchar(50) NOT NULL,
	"visit_date" timestamp with time zone NOT NULL,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"location" varchar(500),
	"gps_latitude" varchar(40),
	"gps_longitude" varchar(40),
	"objectives" varchar(4000),
	"agenda" varchar(4000),
	"priority_code" varchar(50) DEFAULT 'NORMAL' NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"primary_party_id" uuid NOT NULL,
	"linked_appointment_id" uuid,
	"linked_activity_id" uuid,
	"discussion" varchar(8000),
	"decisions" varchar(4000),
	"risks" varchar(4000),
	"next_steps" varchar(4000),
	"minutes_summary" varchar(8000),
	"submitter_notes" varchar(2000),
	"reviewer_comments" varchar(2000),
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"returned_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"report_due_at" timestamp with time zone,
	"sla_breached_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_visit_business_number_uidx" ON "crm_visit" ("business_id", "visit_number");
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_visit_business_id_business_id_fk') THEN
    ALTER TABLE "crm_visit" ADD CONSTRAINT "crm_visit_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_visit_primary_party_id_party_id_fk') THEN
    ALTER TABLE "crm_visit" ADD CONSTRAINT "crm_visit_primary_party_id_party_id_fk" FOREIGN KEY ("primary_party_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_visit_linked_appointment_id_crm_appointment_id_fk') THEN
    ALTER TABLE "crm_visit" ADD CONSTRAINT "crm_visit_linked_appointment_id_crm_appointment_id_fk" FOREIGN KEY ("linked_appointment_id") REFERENCES "public"."crm_appointment"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_visit_linked_activity_id_crm_activity_id_fk') THEN
    ALTER TABLE "crm_visit" ADD CONSTRAINT "crm_visit_linked_activity_id_crm_activity_id_fk" FOREIGN KEY ("linked_activity_id") REFERENCES "public"."crm_activity"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_visit_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_primary_author" boolean DEFAULT false NOT NULL,
	"contribution_notes" varchar(4000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_visit_participant_business_id_business_id_fk') THEN
    ALTER TABLE "crm_visit_participant" ADD CONSTRAINT "crm_visit_participant_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_visit_participant_visit_id_crm_visit_id_fk') THEN
    ALTER TABLE "crm_visit_participant" ADD CONSTRAINT "crm_visit_participant_visit_id_crm_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."crm_visit"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_visit_customer_attendee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"party_id" uuid,
	"display_name" varchar(200) NOT NULL,
	"position_title" varchar(150),
	"email" varchar(200),
	"mobile" varchar(50),
	"organisation" varchar(200),
	"was_present" boolean DEFAULT true NOT NULL,
	"signature_ref" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_visit_customer_attendee_business_id_business_id_fk') THEN
    ALTER TABLE "crm_visit_customer_attendee" ADD CONSTRAINT "crm_visit_customer_attendee_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_visit_customer_attendee_visit_id_crm_visit_id_fk') THEN
    ALTER TABLE "crm_visit_customer_attendee" ADD CONSTRAINT "crm_visit_customer_attendee_visit_id_crm_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."crm_visit"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_visit_customer_attendee_party_id_party_id_fk') THEN
    ALTER TABLE "crm_visit_customer_attendee" ADD CONSTRAINT "crm_visit_customer_attendee_party_id_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_visit_action_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" varchar(2000),
	"owner_user_id" uuid NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"priority_code" varchar(50) DEFAULT 'NORMAL' NOT NULL,
	"status_code" varchar(50) DEFAULT 'OPEN' NOT NULL,
	"linked_activity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_visit_action_item_business_id_business_id_fk') THEN
    ALTER TABLE "crm_visit_action_item" ADD CONSTRAINT "crm_visit_action_item_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_visit_action_item_visit_id_crm_visit_id_fk') THEN
    ALTER TABLE "crm_visit_action_item" ADD CONSTRAINT "crm_visit_action_item_visit_id_crm_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."crm_visit"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_visit_entity_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"entity_type_code" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_visit_entity_link_business_id_business_id_fk') THEN
    ALTER TABLE "crm_visit_entity_link" ADD CONSTRAINT "crm_visit_entity_link_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_visit_entity_link_visit_id_crm_visit_id_fk') THEN
    ALTER TABLE "crm_visit_entity_link" ADD CONSTRAINT "crm_visit_entity_link_visit_id_crm_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."crm_visit"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_visit_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"file_name" varchar(300) NOT NULL,
	"mime_type" varchar(150),
	"storage_key" varchar(500) NOT NULL,
	"file_size_bytes" integer,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_visit_document_business_id_business_id_fk') THEN
    ALTER TABLE "crm_visit_document" ADD CONSTRAINT "crm_visit_document_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_visit_document_visit_id_crm_visit_id_fk') THEN
    ALTER TABLE "crm_visit_document" ADD CONSTRAINT "crm_visit_document_visit_id_crm_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."crm_visit"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
