/**
 * Purpose:
 * BP-004 / IP-08 Communication Management schema.
 *
 * Delivered entities:
 * - crm_communication_channel (metadata catalogue)
 * - crm_communication (interaction log — append-oriented)
 * - crm_communication_entity_link
 */

CREATE TABLE IF NOT EXISTS "crm_communication_channel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"requires_consent_outbound" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_communication_channel_code_uidx"
  ON "crm_communication_channel" ("code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_communication" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"communication_number" varchar(40) NOT NULL,
	"channel_type_code" varchar(50) NOT NULL,
	"direction_code" varchar(20) NOT NULL,
	"subject" varchar(300),
	"summary" varchar(4000) NOT NULL,
	"communicated_at" timestamp with time zone NOT NULL,
	"duration_seconds" integer,
	"status_code" varchar(50) DEFAULT 'LOGGED' NOT NULL,
	"consent_check_result" varchar(50),
	"template_code" varchar(100),
	"thread_id" uuid,
	"primary_party_id" uuid NOT NULL,
	"contact_channel_value" varchar(300),
	"owner_user_id" uuid NOT NULL,
	"is_sensitive" boolean DEFAULT false NOT NULL,
	"addendum_to_id" uuid,
	"linked_activity_id" uuid,
	"linked_visit_id" uuid,
	"record_source_code" varchar(50) DEFAULT 'MANUAL' NOT NULL,
	"delivery_status_code" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_communication_business_number_uidx"
  ON "crm_communication" ("business_id", "communication_number");
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_communication_business_id_business_id_fk') THEN
    ALTER TABLE "crm_communication" ADD CONSTRAINT "crm_communication_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_communication_primary_party_id_party_id_fk') THEN
    ALTER TABLE "crm_communication" ADD CONSTRAINT "crm_communication_primary_party_id_party_id_fk" FOREIGN KEY ("primary_party_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_communication_addendum_to_id_crm_communication_id_fk') THEN
    ALTER TABLE "crm_communication" ADD CONSTRAINT "crm_communication_addendum_to_id_crm_communication_id_fk" FOREIGN KEY ("addendum_to_id") REFERENCES "public"."crm_communication"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_communication_linked_activity_id_crm_activity_id_fk') THEN
    ALTER TABLE "crm_communication" ADD CONSTRAINT "crm_communication_linked_activity_id_crm_activity_id_fk" FOREIGN KEY ("linked_activity_id") REFERENCES "public"."crm_activity"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_communication_linked_visit_id_crm_visit_id_fk') THEN
    ALTER TABLE "crm_communication" ADD CONSTRAINT "crm_communication_linked_visit_id_crm_visit_id_fk" FOREIGN KEY ("linked_visit_id") REFERENCES "public"."crm_visit"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_communication_entity_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"communication_id" uuid NOT NULL,
	"entity_type_code" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_communication_entity_link_business_id_business_id_fk') THEN
    ALTER TABLE "crm_communication_entity_link" ADD CONSTRAINT "crm_communication_entity_link_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_communication_entity_link_communication_id_crm_communication_id_fk') THEN
    ALTER TABLE "crm_communication_entity_link" ADD CONSTRAINT "crm_communication_entity_link_communication_id_crm_communication_id_fk" FOREIGN KEY ("communication_id") REFERENCES "public"."crm_communication"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
