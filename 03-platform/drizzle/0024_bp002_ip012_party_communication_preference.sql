/**

 * Purpose:

 * BP-002 / IP-012 — party_communication_preference profile per Party.

 */



CREATE TABLE IF NOT EXISTS "party_communication_preference" (

	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,

	"business_id" uuid NOT NULL,

	"party_id" uuid NOT NULL,

	"preferred_language_code" varchar(10),

	"preferred_timezone_code" varchar(100),

	"preferred_contact_method" varchar(50),

	"preferred_contact_time" varchar(50),

	"quiet_hours_start" varchar(5),

	"quiet_hours_end" varchar(5),

	"marketing_consent" boolean DEFAULT false NOT NULL,

	"transactional_consent" boolean DEFAULT true NOT NULL,

	"promotional_consent" boolean DEFAULT false NOT NULL,

	"email_enabled" boolean DEFAULT true NOT NULL,

	"sms_enabled" boolean DEFAULT true NOT NULL,

	"whatsapp_enabled" boolean DEFAULT false NOT NULL,

	"phone_enabled" boolean DEFAULT true NOT NULL,

	"push_notification_enabled" boolean DEFAULT false NOT NULL,

	"postal_mail_enabled" boolean DEFAULT false NOT NULL,

	"consent_date" timestamp with time zone,

	"consent_source" varchar(100),

	"consent_version" varchar(50),

	"notes" varchar(2000),

	"status_code" varchar(50) NOT NULL,

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

      AND constraint_name = 'party_communication_preference_business_id_business_id_fk'

  ) THEN

    ALTER TABLE "party_communication_preference"

      ADD CONSTRAINT "party_communication_preference_business_id_business_id_fk"

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

      AND constraint_name = 'party_communication_preference_party_id_party_id_fk'

  ) THEN

    ALTER TABLE "party_communication_preference"

      ADD CONSTRAINT "party_communication_preference_party_id_party_id_fk"

      FOREIGN KEY ("party_id") REFERENCES "public"."party"("id")

      ON DELETE no action ON UPDATE no action;

  END IF;

END $$;

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "party_communication_preference_active_uidx"

  ON "party_communication_preference" ("party_id")

  WHERE "deleted_at" IS NULL AND "status_code" = 'ACTIVE';

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "party_communication_preference_business_party_idx"

  ON "party_communication_preference" ("business_id", "party_id");


