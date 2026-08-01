-- BP-003 / IP-011 – Offering Pricing & Pricing Rules
-- Platform pricing catalogues and offering price items

CREATE TABLE IF NOT EXISTS "pricing_method" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(80) NOT NULL,
  "name" varchar(200) NOT NULL,
  "description" varchar(500),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "pricing_method_code_uidx"
  ON "pricing_method" ("code");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pricing_catalogue" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "code" varchar(80) NOT NULL,
  "name" varchar(300) NOT NULL,
  "description" varchar(4000),
  "currency_code" varchar(3) NOT NULL REFERENCES "currency"("code"),
  "status" varchar(50) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "pricing_catalogue_business_code_uidx"
  ON "pricing_catalogue" ("business_id", "code")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "pricing_catalogue_business_status_idx"
  ON "pricing_catalogue" ("business_id", "status")
  WHERE "deleted_at" IS NULL;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pricing_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "offering_id" uuid NOT NULL REFERENCES "product"("id"),
  "pricing_catalogue_id" uuid NOT NULL REFERENCES "pricing_catalogue"("id"),
  "currency_code" varchar(3) NOT NULL REFERENCES "currency"("code"),
  "unit_price" numeric(20, 6) NOT NULL,
  "minimum_price" numeric(20, 6),
  "maximum_price" numeric(20, 6),
  "pricing_method" varchar(80) NOT NULL,
  "customer_segment" varchar(100),
  "sales_channel" varchar(100),
  "region" varchar(100),
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz,
  "status" varchar(50) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE INDEX IF NOT EXISTS "pricing_item_business_offering_idx"
  ON "pricing_item" ("business_id", "offering_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "pricing_item_business_catalogue_idx"
  ON "pricing_item" ("business_id", "pricing_catalogue_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "pricing_item_business_status_idx"
  ON "pricing_item" ("business_id", "status")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "pricing_item_effective_period_idx"
  ON "pricing_item" ("business_id", "effective_from", "effective_to")
  WHERE "deleted_at" IS NULL;
