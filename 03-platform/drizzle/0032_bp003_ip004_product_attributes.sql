-- BP-003 / IP-004 – Product Attributes Engine
-- Metadata-driven attribute groups, definitions, options, scope assignments, and product values

CREATE TABLE IF NOT EXISTS "attribute_group" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "code" varchar(80) NOT NULL,
  "name" varchar(300) NOT NULL,
  "description" varchar(4000),
  "display_order" integer DEFAULT 0 NOT NULL,
  "status" varchar(50) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "attribute_group_business_code_uidx"
  ON "attribute_group" ("business_id", "code")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "attribute_group_business_status_idx"
  ON "attribute_group" ("business_id", "status")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "product_attribute_definition" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "attribute_group_id" uuid NOT NULL REFERENCES "attribute_group"("id"),
  "code" varchar(80) NOT NULL,
  "name" varchar(300) NOT NULL,
  "description" varchar(4000),
  "data_type" varchar(50) NOT NULL,
  "validation_rule" jsonb,
  "default_value" text,
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_mandatory" boolean DEFAULT false NOT NULL,
  "is_read_only" boolean DEFAULT false NOT NULL,
  "is_hidden" boolean DEFAULT false NOT NULL,
  "status" varchar(50) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_attribute_definition_business_code_uidx"
  ON "product_attribute_definition" ("business_id", "code")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "product_attribute_definition_group_name_uidx"
  ON "product_attribute_definition" ("attribute_group_id", "name")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "product_attribute_definition_business_group_idx"
  ON "product_attribute_definition" ("business_id", "attribute_group_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "product_attribute_definition_business_status_idx"
  ON "product_attribute_definition" ("business_id", "status")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "product_attribute_option" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "attribute_definition_id" uuid NOT NULL REFERENCES "product_attribute_definition"("id"),
  "option_code" varchar(80) NOT NULL,
  "option_label" varchar(300) NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "status" varchar(50) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_attribute_option_definition_code_uidx"
  ON "product_attribute_option" ("attribute_definition_id", "option_code")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "product_attribute_option_definition_idx"
  ON "product_attribute_option" ("attribute_definition_id")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "product_attribute_definition_scope" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "attribute_definition_id" uuid NOT NULL REFERENCES "product_attribute_definition"("id"),
  "scope_type" varchar(50) NOT NULL,
  "product_type_code" varchar(80),
  "classification_id" uuid REFERENCES "product_classification"("id"),
  "display_order" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_attribute_scope_type_product_type_uidx"
  ON "product_attribute_definition_scope" ("business_id", "attribute_definition_id", "scope_type", "product_type_code")
  WHERE "deleted_at" IS NULL AND "product_type_code" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "product_attribute_scope_type_classification_uidx"
  ON "product_attribute_definition_scope" ("business_id", "attribute_definition_id", "scope_type", "classification_id")
  WHERE "deleted_at" IS NULL AND "classification_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "product_attribute_scope_business_definition_idx"
  ON "product_attribute_definition_scope" ("business_id", "attribute_definition_id")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "product_attribute_assignment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "product_id" uuid NOT NULL REFERENCES "product"("id"),
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

CREATE UNIQUE INDEX IF NOT EXISTS "product_attribute_assignment_product_definition_uidx"
  ON "product_attribute_assignment" ("business_id", "product_id", "attribute_definition_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "product_attribute_assignment_business_product_idx"
  ON "product_attribute_assignment" ("business_id", "product_id")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "attribute_timeline" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "attribute_definition_id" uuid NOT NULL REFERENCES "product_attribute_definition"("id"),
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

CREATE INDEX IF NOT EXISTS "attribute_timeline_business_definition_idx"
  ON "attribute_timeline" ("business_id", "attribute_definition_id")
  WHERE "deleted_at" IS NULL;
