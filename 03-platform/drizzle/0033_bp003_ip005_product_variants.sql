-- BP-003 / IP-005 – Product Variants Engine
-- Sellable/versioned instances of master offerings with attribute overrides

CREATE TABLE IF NOT EXISTS "product_variant" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "product_id" uuid NOT NULL REFERENCES "product"("id"),
  "variant_code" varchar(80) NOT NULL,
  "variant_name" varchar(300) NOT NULL,
  "status" varchar(50) NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "record_source" varchar(50) DEFAULT 'PLATFORM_CREATED' NOT NULL,
  "combination_fingerprint" varchar(500),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_variant_business_code_uidx"
  ON "product_variant" ("business_id", "variant_code")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "product_variant_product_fingerprint_uidx"
  ON "product_variant" ("business_id", "product_id", "combination_fingerprint")
  WHERE "deleted_at" IS NULL AND "combination_fingerprint" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "product_variant_business_product_idx"
  ON "product_variant" ("business_id", "product_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "product_variant_business_status_idx"
  ON "product_variant" ("business_id", "status")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "product_variant_attribute" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "variant_id" uuid NOT NULL REFERENCES "product_variant"("id"),
  "attribute_definition_id" uuid NOT NULL REFERENCES "product_attribute_definition"("id"),
  "attribute_value" jsonb,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_variant_attribute_variant_definition_uidx"
  ON "product_variant_attribute" ("business_id", "variant_id", "attribute_definition_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "product_variant_attribute_business_variant_idx"
  ON "product_variant_attribute" ("business_id", "variant_id")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "variant_timeline" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "variant_id" uuid NOT NULL REFERENCES "product_variant"("id"),
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

CREATE INDEX IF NOT EXISTS "variant_timeline_business_variant_idx"
  ON "variant_timeline" ("business_id", "variant_id")
  WHERE "deleted_at" IS NULL;
