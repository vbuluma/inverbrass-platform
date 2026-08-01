-- BP-003 / IP-012 – Offering Analytics & Performance
-- Configurable metric definitions and immutable snapshots

CREATE TABLE IF NOT EXISTS "offering_metric_definition" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "offering_metric_definition_business_code_uidx"
  ON "offering_metric_definition" ("business_id", "code")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "offering_metric_definition_business_category_idx"
  ON "offering_metric_definition" ("business_id", "metric_category")
  WHERE "deleted_at" IS NULL;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "offering_metric_snapshot" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "offering_id" uuid NOT NULL REFERENCES "product"("id"),
  "metric_definition_id" uuid NOT NULL REFERENCES "offering_metric_definition"("id"),
  "snapshot_period" varchar(20) NOT NULL,
  "snapshot_date" date NOT NULL,
  "metric_value" numeric(20, 6) NOT NULL,
  "currency_code" varchar(3),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "offering_metric_snapshot_unique_uidx"
  ON "offering_metric_snapshot" (
    "business_id",
    "offering_id",
    "metric_definition_id",
    "snapshot_period",
    "snapshot_date"
  );

CREATE INDEX IF NOT EXISTS "offering_metric_snapshot_offering_idx"
  ON "offering_metric_snapshot" ("business_id", "offering_id", "snapshot_date");

CREATE INDEX IF NOT EXISTS "offering_metric_snapshot_period_idx"
  ON "offering_metric_snapshot" ("business_id", "snapshot_period", "snapshot_date");
