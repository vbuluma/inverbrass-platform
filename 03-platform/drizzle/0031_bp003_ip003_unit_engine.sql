-- BP-003 / IP-003 – Units of Measure Engine
-- Business-scoped measurement categories, units, conversions, and timeline

CREATE TABLE IF NOT EXISTS "unit_category" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "code" varchar(80) NOT NULL,
  "name" varchar(300) NOT NULL,
  "description" varchar(4000),
  "base_unit_id" uuid,
  "status" varchar(50) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "unit_category_business_code_uidx"
  ON "unit_category" ("business_id", "code")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "unit_category_business_status_idx"
  ON "unit_category" ("business_id", "status")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "unit_of_measure" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "category_id" uuid NOT NULL REFERENCES "unit_category"("id"),
  "code" varchar(80) NOT NULL,
  "name" varchar(300) NOT NULL,
  "symbol" varchar(20) NOT NULL,
  "conversion_factor" numeric(20, 10) NOT NULL,
  "decimal_precision" integer DEFAULT 2 NOT NULL,
  "rounding_rule" varchar(50) DEFAULT 'HALF_UP' NOT NULL,
  "is_base_unit" boolean DEFAULT false NOT NULL,
  "status" varchar(50) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "unit_of_measure_business_code_uidx"
  ON "unit_of_measure" ("business_id", "code")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "unit_of_measure_category_symbol_uidx"
  ON "unit_of_measure" ("category_id", "symbol")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "unit_of_measure_business_category_idx"
  ON "unit_of_measure" ("business_id", "category_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "unit_of_measure_business_status_idx"
  ON "unit_of_measure" ("business_id", "status")
  WHERE "deleted_at" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unit_category_base_unit_id_fkey'
  ) THEN
    ALTER TABLE "unit_category"
      ADD CONSTRAINT "unit_category_base_unit_id_fkey"
      FOREIGN KEY ("base_unit_id") REFERENCES "unit_of_measure"("id");
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "unit_timeline" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "unit_id" uuid NOT NULL REFERENCES "unit_of_measure"("id"),
  "event_date_time" timestamptz NOT NULL,
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
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE INDEX IF NOT EXISTS "unit_timeline_business_unit_idx"
  ON "unit_timeline" ("business_id", "unit_id")
  WHERE "deleted_at" IS NULL;
