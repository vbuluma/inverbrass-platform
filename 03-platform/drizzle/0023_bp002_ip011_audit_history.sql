/**
 * Purpose:
 * BP-002 / IP-011 — audit_history append-only immutable change log.
 */

CREATE TABLE IF NOT EXISTS "audit_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"party_id" uuid,
	"entity_name" varchar(100) NOT NULL,
	"entity_id" uuid NOT NULL,
	"operation" varchar(50) NOT NULL,
	"field_name" varchar(200),
	"old_value" text,
	"new_value" text,
	"changed_by" uuid,
	"changed_date_time" timestamp with time zone NOT NULL,
	"source_module" varchar(100) NOT NULL,
	"correlation_id" uuid,
	"request_id" varchar(100),
	"ip_address" varchar(45),
	"browser_client" varchar(500),
	"device" varchar(200),
	"system_generated" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"retention_flag" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'audit_history_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "audit_history"
      ADD CONSTRAINT "audit_history_business_id_business_id_fk"
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
      AND constraint_name = 'audit_history_party_id_party_id_fk'
  ) THEN
    ALTER TABLE "audit_history"
      ADD CONSTRAINT "audit_history_party_id_party_id_fk"
      FOREIGN KEY ("party_id") REFERENCES "public"."party"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_history_party_feed_idx"
  ON "audit_history" ("business_id", "party_id", "changed_date_time" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_history_entity_idx"
  ON "audit_history" ("business_id", "entity_name", "entity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_history_operation_idx"
  ON "audit_history" ("business_id", "party_id", "operation");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_history_correlation_idx"
  ON "audit_history" ("correlation_id");
