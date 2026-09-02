-- BP-009 / IP-03 – RFX duration, evaluation lock, opening policy
-- Does not add quote lines, scoring, unseal, or purchase orders.

ALTER TABLE "procurement_sourcing_event"
  ADD COLUMN IF NOT EXISTS "closes_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "original_closes_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "risk_level" varchar(20) DEFAULT 'LOW' NOT NULL,
  ADD COLUMN IF NOT EXISTS "category_code" varchar(50),
  ADD COLUMN IF NOT EXISTS "opening_policy" varchar(30) DEFAULT 'STANDARD' NOT NULL,
  ADD COLUMN IF NOT EXISTS "opening_policy_source" varchar(40) DEFAULT 'ORGANISATION_DEFAULT' NOT NULL,
  ADD COLUMN IF NOT EXISTS "evaluation_method" varchar(40) DEFAULT 'LOWEST_COMPLIANT' NOT NULL,
  ADD COLUMN IF NOT EXISTS "technical_weight" numeric(8, 2) DEFAULT '0' NOT NULL,
  ADD COLUMN IF NOT EXISTS "financial_weight" numeric(8, 2) DEFAULT '100' NOT NULL,
  ADD COLUMN IF NOT EXISTS "financial_basis" varchar(20) DEFAULT 'YEAR_1' NOT NULL;

--> statement-breakpoint

UPDATE "procurement_sourcing_event"
SET
  "closes_at" = COALESCE("closes_at", "created_at" + interval '14 days'),
  "original_closes_at" = COALESCE("original_closes_at", "created_at" + interval '14 days');

--> statement-breakpoint

ALTER TABLE "procurement_sourcing_event"
  ALTER COLUMN "closes_at" SET NOT NULL,
  ALTER COLUMN "original_closes_at" SET NOT NULL;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_sourcing_control" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "default_opening_policy" varchar(30) DEFAULT 'STANDARD' NOT NULL,
  "extension_requires_approval" boolean DEFAULT false NOT NULL,
  "maker_checker_min_amount" numeric(20, 6),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_sourcing_control_business_uidx"
  ON "procurement_sourcing_control" ("business_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_sourcing_opening_rule" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "dimension" varchar(20) NOT NULL,
  "match_value" varchar(80) NOT NULL,
  "required_policy" varchar(30) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "procurement_sourcing_opening_rule_business_idx"
  ON "procurement_sourcing_opening_rule" ("business_id", "dimension");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_sourcing_evaluation_phase" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "event_id" uuid NOT NULL REFERENCES "procurement_sourcing_event"("id"),
  "phase_code" varchar(30) NOT NULL,
  "included" boolean DEFAULT false NOT NULL,
  "sequence" integer NOT NULL,
  "weight" numeric(8, 2) DEFAULT '0' NOT NULL,
  "passmark" numeric(8, 2) DEFAULT '0' NOT NULL,
  "required" boolean DEFAULT false NOT NULL
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_sourcing_evaluation_phase_uidx"
  ON "procurement_sourcing_evaluation_phase" ("event_id", "phase_code");
