/**
 * Purpose:
 * BP-002 / IP-010 — party_timeline append-only activity feed.
 */

CREATE TABLE IF NOT EXISTS "party_timeline" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
	"event_date_time" timestamp with time zone NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"event_category" varchar(50) NOT NULL,
	"source_module" varchar(100) NOT NULL,
	"reference_entity" varchar(100),
	"reference_id" uuid,
	"summary" varchar(500) NOT NULL,
	"description" varchar(4000),
	"performed_by_user_id" uuid,
	"performed_by_name" varchar(200),
	"visibility" varchar(50) NOT NULL,
	"system_generated" boolean DEFAULT true NOT NULL,
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
      AND constraint_name = 'party_timeline_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "party_timeline"
      ADD CONSTRAINT "party_timeline_business_id_business_id_fk"
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
      AND constraint_name = 'party_timeline_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "party_timeline"
      ADD CONSTRAINT "party_timeline_party_id_party_id_fk"
      FOREIGN KEY ("party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_timeline_party_feed_idx"
  ON "party_timeline" ("business_id", "party_id", "event_date_time" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_timeline_category_idx"
  ON "party_timeline" ("business_id", "party_id", "event_category");
