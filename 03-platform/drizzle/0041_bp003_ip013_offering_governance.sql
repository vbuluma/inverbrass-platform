-- BP-003 / IP-013 – Offering Governance
-- Governance records, immutable history, and metadata-driven checklist definitions

CREATE TABLE IF NOT EXISTS "offering_governance_status" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(80) NOT NULL,
  "name" varchar(200) NOT NULL,
  "description" varchar(500),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "offering_governance_status_code_uidx"
  ON "offering_governance_status" ("code");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "offering_governance_checklist_definition" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid REFERENCES "business"("id"),
  "code" varchar(80) NOT NULL,
  "name" varchar(300) NOT NULL,
  "description" varchar(4000),
  "source_module" varchar(100) NOT NULL,
  "evaluator_key" varchar(100) NOT NULL,
  "is_mandatory" boolean DEFAULT true NOT NULL,
  "weight" integer DEFAULT 10 NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "offering_governance_checklist_business_code_uidx"
  ON "offering_governance_checklist_definition" ("business_id", "code");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "offering_governance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "offering_id" uuid NOT NULL REFERENCES "product"("id"),
  "responsible_business_owner_party_id" uuid REFERENCES "party"("id"),
  "technical_owner_party_id" uuid REFERENCES "party"("id"),
  "product_steward_party_id" uuid REFERENCES "party"("id"),
  "governance_status" varchar(80) NOT NULL,
  "readiness_score" numeric(5, 2) DEFAULT 0 NOT NULL,
  "last_validation_date" timestamptz,
  "is_locked" boolean DEFAULT false NOT NULL,
  "notes" varchar(4000),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "offering_governance_business_offering_uidx"
  ON "offering_governance" ("business_id", "offering_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "offering_governance_business_status_idx"
  ON "offering_governance" ("business_id", "governance_status")
  WHERE "deleted_at" IS NULL;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "offering_governance_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "offering_governance_id" uuid NOT NULL REFERENCES "offering_governance"("id"),
  "change_type" varchar(100) NOT NULL,
  "old_value" varchar(4000),
  "new_value" varchar(4000),
  "changed_by" uuid,
  "change_date" timestamptz DEFAULT now() NOT NULL,
  "metadata" jsonb
);

CREATE INDEX IF NOT EXISTS "offering_governance_history_governance_idx"
  ON "offering_governance_history" ("offering_governance_id", "change_date");
