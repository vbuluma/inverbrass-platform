-- BP-003 / IP-006 – Bundles & Packages Engine
-- Composite commercial offerings composed of products and variants

CREATE TABLE IF NOT EXISTS "product_bundle" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "bundle_code" varchar(80) NOT NULL,
  "bundle_name" varchar(300) NOT NULL,
  "bundle_type" varchar(80) NOT NULL,
  "status_code" varchar(50) NOT NULL,
  "owner_party_id" uuid,
  "description" varchar(4000),
  "effective_from" date,
  "effective_to" date,
  "pricing_strategy" varchar(80) DEFAULT 'SUM_OF_ITEMS' NOT NULL,
  "availability_type" varchar(80) DEFAULT 'ACTIVE' NOT NULL,
  "record_source" varchar(50) DEFAULT 'PLATFORM_CREATED' NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_bundle_business_code_uidx"
  ON "product_bundle" ("business_id", "bundle_code")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "product_bundle_business_status_idx"
  ON "product_bundle" ("business_id", "status_code")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "product_bundle_business_owner_idx"
  ON "product_bundle" ("business_id", "owner_party_id")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "product_bundle_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "bundle_id" uuid NOT NULL REFERENCES "product_bundle"("id"),
  "product_id" uuid NOT NULL REFERENCES "product"("id"),
  "variant_id" uuid REFERENCES "product_variant"("id"),
  "quantity" numeric(18, 4) DEFAULT 1 NOT NULL,
  "mandatory" boolean DEFAULT true NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_bundle_item_bundle_product_variant_uidx"
  ON "product_bundle_item" (
    "bundle_id",
    "product_id",
    COALESCE("variant_id", '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "product_bundle_item_bundle_idx"
  ON "product_bundle_item" ("bundle_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "product_bundle_item_product_idx"
  ON "product_bundle_item" ("product_id")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "bundle_timeline" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "bundle_id" uuid NOT NULL REFERENCES "product_bundle"("id"),
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

CREATE INDEX IF NOT EXISTS "bundle_timeline_business_bundle_idx"
  ON "bundle_timeline" ("business_id", "bundle_id")
  WHERE "deleted_at" IS NULL;
