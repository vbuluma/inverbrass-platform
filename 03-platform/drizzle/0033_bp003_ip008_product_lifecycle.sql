-- BP-003 / IP-008 – Product Lifecycle Management
-- Lifecycle metadata, event history, and governed transitions

CREATE TABLE IF NOT EXISTS "product_lifecycle" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "product_id" uuid NOT NULL REFERENCES "product"("id"),
  "current_state" varchar(50) NOT NULL,
  "previous_state" varchar(50),
  "effective_from" date,
  "effective_to" date,
  "approval_required" boolean DEFAULT false NOT NULL,
  "approval_status" varchar(50),
  "retirement_reason" varchar(100),
  "replacement_product_id" uuid REFERENCES "product"("id"),
  "version_number" varchar(20) DEFAULT '1.0' NOT NULL,
  "major_version" integer DEFAULT 1 NOT NULL,
  "minor_version" integer DEFAULT 0 NOT NULL,
  "scheduled_action" varchar(50),
  "scheduled_at" date,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_lifecycle_product_uidx"
  ON "product_lifecycle" ("product_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "product_lifecycle_business_state_idx"
  ON "product_lifecycle" ("business_id", "current_state")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "product_lifecycle_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "product_id" uuid NOT NULL REFERENCES "product"("id"),
  "event_type" varchar(80) NOT NULL,
  "old_state" varchar(50),
  "new_state" varchar(50),
  "reason" varchar(500),
  "performed_by" uuid,
  "performed_at" timestamptz DEFAULT now() NOT NULL,
  "metadata" jsonb
);

CREATE INDEX IF NOT EXISTS "product_lifecycle_event_product_idx"
  ON "product_lifecycle_event" ("product_id", "performed_at" DESC);

CREATE INDEX IF NOT EXISTS "product_lifecycle_event_business_idx"
  ON "product_lifecycle_event" ("business_id", "performed_at" DESC);
