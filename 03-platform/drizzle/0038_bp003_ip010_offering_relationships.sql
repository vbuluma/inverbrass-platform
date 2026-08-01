-- BP-003 / IP-010 – Offering Relationships
-- Configurable relationship types and directed offering links

CREATE TABLE IF NOT EXISTS "offering_relationship_type" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "code" varchar(80) NOT NULL,
  "name" varchar(300) NOT NULL,
  "description" varchar(2000),
  "is_bidirectional" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS "offering_relationship_type_business_code_uidx"
  ON "offering_relationship_type" ("business_id", "code")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "offering_relationship" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "source_offering_id" uuid NOT NULL REFERENCES "product"("id"),
  "target_offering_id" uuid NOT NULL REFERENCES "product"("id"),
  "relationship_type_id" uuid NOT NULL REFERENCES "offering_relationship_type"("id"),
  "effective_from" date NOT NULL,
  "effective_to" date,
  "status" varchar(50) NOT NULL,
  "notes" varchar(2000),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "offering_relationship_active_unique_uidx"
  ON "offering_relationship" ("source_offering_id", "target_offering_id", "relationship_type_id")
  WHERE "status" = 'ACTIVE' AND "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "offering_relationship_source_idx"
  ON "offering_relationship" ("business_id", "source_offering_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "offering_relationship_target_idx"
  ON "offering_relationship" ("business_id", "target_offering_id")
  WHERE "deleted_at" IS NULL;
