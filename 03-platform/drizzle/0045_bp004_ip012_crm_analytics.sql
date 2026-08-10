-- BP-004 / IP-12 – CRM Analytics & Dashboards (Phase 12.1 Foundation)
-- Configurable metric definitions and immutable snapshots

CREATE TABLE IF NOT EXISTS "crm_metric_definition" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "code" varchar(80) NOT NULL,
  "name" varchar(300) NOT NULL,
  "description" varchar(4000),
  "metric_category" varchar(80) NOT NULL,
  "calculation_method" varchar(80) NOT NULL,
  "unit_of_measure" varchar(80),
  "is_active" boolean DEFAULT true NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_metric_definition_business_code_uidx"
  ON "crm_metric_definition" ("business_id", "code")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "crm_metric_definition_business_category_idx"
  ON "crm_metric_definition" ("business_id", "metric_category")
  WHERE "deleted_at" IS NULL;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "crm_metric_snapshot" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "metric_definition_id" uuid NOT NULL REFERENCES "crm_metric_definition"("id"),
  "party_id" uuid REFERENCES "party"("id"),
  "snapshot_period" varchar(20) NOT NULL,
  "snapshot_date" date NOT NULL,
  "metric_value" numeric(20, 6) NOT NULL,
  "currency_code" varchar(3),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_metric_snapshot_unique_uidx"
  ON "crm_metric_snapshot" (
    "business_id",
    "metric_definition_id",
    "snapshot_period",
    "snapshot_date",
    COALESCE("party_id", '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE INDEX IF NOT EXISTS "crm_metric_snapshot_business_date_idx"
  ON "crm_metric_snapshot" ("business_id", "snapshot_date");

CREATE INDEX IF NOT EXISTS "crm_metric_snapshot_party_idx"
  ON "crm_metric_snapshot" ("business_id", "party_id", "snapshot_date")
  WHERE "party_id" IS NOT NULL;
