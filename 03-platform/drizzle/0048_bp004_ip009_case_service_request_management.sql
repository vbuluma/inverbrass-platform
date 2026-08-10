/**
 * Purpose:
 * BP-004 / IP-09 Case & Service Request Management schema.
 *
 * Delivered entities:
 * - crm_case_type, crm_case_status, crm_case_priority, crm_case_severity, crm_case_resolution_code
 * - crm_case (service request / complaint master)
 * - crm_case_entity_link
 * - crm_case_escalation (immutable history)
 *
 * Note: No module-local SLA segment tables — ENG-003n owns SLA architecture (stub fields on case).
 */

CREATE TABLE IF NOT EXISTS "crm_case_type" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "crm_case_type_code_uidx"
  ON "crm_case_type" ("code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_case_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"is_terminal" boolean DEFAULT false NOT NULL,
	"is_editable" boolean DEFAULT true NOT NULL,
	"pauses_sla" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_case_status_code_uidx"
  ON "crm_case_status" ("code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_case_priority" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"first_response_target_hours" integer NOT NULL,
	"resolution_target_hours" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_case_priority_code_uidx"
  ON "crm_case_priority" ("code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_case_severity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"requires_immediate_owner" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_case_severity_code_uidx"
  ON "crm_case_severity" ("code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_case_resolution_code" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "crm_case_resolution_code_code_uidx"
  ON "crm_case_resolution_code" ("code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"case_number" varchar(40) NOT NULL,
	"case_type_code" varchar(50) NOT NULL,
	"category_code" varchar(50),
	"subject" varchar(300) NOT NULL,
	"description" varchar(8000) NOT NULL,
	"status_code" varchar(50) DEFAULT 'NEW' NOT NULL,
	"priority_code" varchar(50) DEFAULT 'NORMAL' NOT NULL,
	"severity_code" varchar(50) DEFAULT 'MEDIUM' NOT NULL,
	"channel_code" varchar(50),
	"owner_user_id" uuid,
	"queue_code" varchar(50),
	"primary_party_id" uuid NOT NULL,
	"primary_contact_party_id" uuid,
	"linked_communication_id" uuid,
	"resolution_summary" varchar(4000),
	"resolution_code" varchar(50),
	"root_cause_code" varchar(50),
	"satisfaction_rating" integer,
	"satisfaction_comment" varchar(2000),
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_responded_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"escalated_at" timestamp with time zone,
	"sla_first_response_due_at" timestamp with time zone,
	"sla_resolution_due_at" timestamp with time zone,
	"sla_breached_at" timestamp with time zone,
	"sla_paused_at" timestamp with time zone,
	"sla_pause_reason_code" varchar(50),
	"reopen_reason" varchar(2000),
	"reopened_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_case_business_number_uidx"
  ON "crm_case" ("business_id", "case_number");
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_case_business_id_business_id_fk') THEN
    ALTER TABLE "crm_case" ADD CONSTRAINT "crm_case_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_case_primary_party_id_party_id_fk') THEN
    ALTER TABLE "crm_case" ADD CONSTRAINT "crm_case_primary_party_id_party_id_fk" FOREIGN KEY ("primary_party_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_case_primary_contact_party_id_party_id_fk') THEN
    ALTER TABLE "crm_case" ADD CONSTRAINT "crm_case_primary_contact_party_id_party_id_fk" FOREIGN KEY ("primary_contact_party_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_case_linked_communication_id_crm_communication_id_fk') THEN
    ALTER TABLE "crm_case" ADD CONSTRAINT "crm_case_linked_communication_id_crm_communication_id_fk" FOREIGN KEY ("linked_communication_id") REFERENCES "public"."crm_communication"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_case_entity_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"entity_type_code" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_case_entity_link_business_id_business_id_fk') THEN
    ALTER TABLE "crm_case_entity_link" ADD CONSTRAINT "crm_case_entity_link_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_case_entity_link_case_id_crm_case_id_fk') THEN
    ALTER TABLE "crm_case_entity_link" ADD CONSTRAINT "crm_case_entity_link_case_id_crm_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."crm_case"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_case_escalation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"from_owner_user_id" uuid,
	"to_owner_user_id" uuid,
	"reason" varchar(2000) NOT NULL,
	"triggered_by" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_case_escalation_business_id_business_id_fk') THEN
    ALTER TABLE "crm_case_escalation" ADD CONSTRAINT "crm_case_escalation_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_case_escalation_case_id_crm_case_id_fk') THEN
    ALTER TABLE "crm_case_escalation" ADD CONSTRAINT "crm_case_escalation_case_id_crm_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."crm_case"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
