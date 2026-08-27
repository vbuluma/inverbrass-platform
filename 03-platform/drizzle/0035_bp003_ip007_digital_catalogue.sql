-- BP-003 / IP-007 – Digital Catalogue Engine
-- Channel publishing and visibility rules for catalogue presentation

CREATE TABLE IF NOT EXISTS "catalogue_channel" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(80) NOT NULL,
  "name" varchar(200) NOT NULL,
  "description" varchar(1000),
  "status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "catalogue_channel_code_uidx"
  ON "catalogue_channel" ("code");

CREATE TABLE IF NOT EXISTS "product_catalogue_publication" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "product_id" uuid NOT NULL REFERENCES "product"("id"),
  "channel_id" uuid NOT NULL REFERENCES "catalogue_channel"("id"),
  "published" boolean DEFAULT false NOT NULL,
  "visibility" varchar(80) DEFAULT 'PUBLIC' NOT NULL,
  "publish_from" timestamptz,
  "publish_to" timestamptz,
  "featured" boolean DEFAULT false NOT NULL,
  "recommended" boolean DEFAULT false NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_catalogue_publication_business_product_channel_uidx"
  ON "product_catalogue_publication" ("business_id", "product_id", "channel_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "product_catalogue_publication_business_published_idx"
  ON "product_catalogue_publication" ("business_id", "published")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "product_catalogue_publication_business_product_idx"
  ON "product_catalogue_publication" ("business_id", "product_id")
  WHERE "deleted_at" IS NULL;

INSERT INTO "catalogue_channel" ("code", "name", "description", "display_order")
VALUES
  ('WEBSITE', 'Website', 'Public website catalogue', 1),
  ('MOBILE_APP', 'Mobile App', 'Native mobile application catalogue', 2),
  ('CUSTOMER_PORTAL', 'Customer Portal', 'Authenticated customer portal', 3),
  ('PARTNER_PORTAL', 'Partner Portal', 'Partner and reseller portal', 4),
  ('WHATSAPP', 'WhatsApp', 'WhatsApp channel catalogue', 5),
  ('QR', 'QR Catalogue', 'QR code entry point', 6),
  ('API', 'API', 'Programmatic API consumers', 7),
  ('MARKETPLACE', 'Marketplace', 'External marketplace listings', 8)
ON CONFLICT ("code") DO NOTHING;
