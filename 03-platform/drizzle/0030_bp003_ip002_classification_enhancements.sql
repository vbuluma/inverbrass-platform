-- BP-003 / IP-002 – Catalogue Structure enhancements (freeze refinements)

-- Classification type reference catalogue
CREATE TABLE IF NOT EXISTS "product_classification_type" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL UNIQUE,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

-- Extend product_classification
ALTER TABLE "product_classification"
  ADD COLUMN IF NOT EXISTS "classification_type_code" varchar(50) DEFAULT 'CATEGORY' NOT NULL,
  ADD COLUMN IF NOT EXISTS "industry_code" varchar(50),
  ADD COLUMN IF NOT EXISTS "icon" varchar(50),
  ADD COLUMN IF NOT EXISTS "owner_party_id" uuid REFERENCES "party"("id"),
  ADD COLUMN IF NOT EXISTS "business_unit" varchar(200),
  ADD COLUMN IF NOT EXISTS "effective_to" date,
  ADD COLUMN IF NOT EXISTS "approval_status" varchar(50) DEFAULT 'NOT_REQUIRED' NOT NULL,
  ADD COLUMN IF NOT EXISTS "reason_for_change" varchar(2000);

-- Migrate legacy INACTIVE status to ARCHIVED
UPDATE "product_classification"
SET "status" = 'ARCHIVED'
WHERE "status" = 'INACTIVE';

CREATE INDEX IF NOT EXISTS "product_classification_industry_idx"
  ON "product_classification" ("business_id", "industry_code")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "product_classification_type_code_idx"
  ON "product_classification" ("business_id", "classification_type_code")
  WHERE "deleted_at" IS NULL;

-- Classification-scoped timeline (ENG-003f)
CREATE TABLE IF NOT EXISTS "product_classification_timeline" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "classification_id" uuid NOT NULL REFERENCES "product_classification"("id"),
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

CREATE INDEX IF NOT EXISTS "product_classification_timeline_class_idx"
  ON "product_classification_timeline" ("business_id", "classification_id", "event_date_time" DESC);

-- Extension point for IP-012 product/classification relationships
CREATE TABLE IF NOT EXISTS "product_classification_relationship" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "source_classification_id" uuid NOT NULL REFERENCES "product_classification"("id"),
  "target_classification_id" uuid NOT NULL REFERENCES "product_classification"("id"),
  "relationship_type_code" varchar(50) NOT NULL,
  "status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
  "effective_date" date,
  "retirement_date" date,
  "notes" varchar(2000),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_classification_relationship_uidx"
  ON "product_classification_relationship" (
    "business_id",
    "source_classification_id",
    "target_classification_id",
    "relationship_type_code"
  )
  WHERE "deleted_at" IS NULL AND "retirement_date" IS NULL;
