-- BP-003 / IP-002 – Product Classification & Categorization
-- Metadata-driven classification hierarchy (ENG-003f)

CREATE TABLE IF NOT EXISTS "product_classification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "parent_classification_id" uuid,
  "code" varchar(80) NOT NULL,
  "name" varchar(300) NOT NULL,
  "description" varchar(4000),
  "display_order" integer DEFAULT 0 NOT NULL,
  "hierarchy_level" integer DEFAULT 0 NOT NULL,
  "status" varchar(50) NOT NULL,
  "effective_date" date,
  "retirement_date" date,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_classification_business_code_uidx"
  ON "product_classification" ("business_id", "code")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "product_classification_business_parent_idx"
  ON "product_classification" ("business_id", "parent_classification_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "product_classification_business_status_idx"
  ON "product_classification" ("business_id", "status")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "product_classification_assignment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "product_id" uuid NOT NULL REFERENCES "product"("id"),
  "classification_id" uuid NOT NULL REFERENCES "product_classification"("id"),
  "is_primary" boolean DEFAULT false NOT NULL,
  "effective_date" date,
  "retirement_date" date,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_classification_assignment_product_class_uidx"
  ON "product_classification_assignment" ("business_id", "product_id", "classification_id")
  WHERE "deleted_at" IS NULL AND "retirement_date" IS NULL;

CREATE INDEX IF NOT EXISTS "product_classification_assignment_product_idx"
  ON "product_classification_assignment" ("business_id", "product_id")
  WHERE "deleted_at" IS NULL AND "retirement_date" IS NULL;

CREATE INDEX IF NOT EXISTS "product_classification_assignment_classification_idx"
  ON "product_classification_assignment" ("business_id", "classification_id")
  WHERE "deleted_at" IS NULL AND "retirement_date" IS NULL;
