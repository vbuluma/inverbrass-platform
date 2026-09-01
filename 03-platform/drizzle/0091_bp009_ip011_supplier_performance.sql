-- BP-009 IP-11 Supplier Performance & Governance

CREATE TABLE IF NOT EXISTS "procurement_performance_control" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "default_period_days" integer DEFAULT 90 NOT NULL,
  "preferred_score_threshold" numeric(8, 2) DEFAULT '75' NOT NULL,
  "preferred_requires_approval" boolean DEFAULT true NOT NULL,
  "block_blacklisted_transactions" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_performance_control_business_uidx"
  ON "procurement_performance_control" ("business_id");

CREATE TABLE IF NOT EXISTS "procurement_performance_measure" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "code" varchar(60) NOT NULL,
  "name" varchar(120) NOT NULL,
  "description" varchar(500),
  "dimension" varchar(60) NOT NULL,
  "weight" numeric(8, 2) DEFAULT '1' NOT NULL,
  "higher_is_better" boolean DEFAULT true NOT NULL,
  "display_order" integer DEFAULT 100 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_performance_measure_business_code_uidx"
  ON "procurement_performance_measure" ("business_id", "code");

CREATE TABLE IF NOT EXISTS "procurement_performance_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "measure_code" varchar(60) NOT NULL,
  "source_type" varchar(40) NOT NULL,
  "source_id" varchar(64) NOT NULL,
  "source_key" varchar(200) NOT NULL,
  "event_count" integer DEFAULT 1 NOT NULL,
  "event_value" numeric(14, 4) DEFAULT '1' NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_performance_event_source_key_uidx"
  ON "procurement_performance_event" ("business_id", "source_key");

CREATE TABLE IF NOT EXISTS "procurement_supplier_scorecard" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "composite_score" numeric(8, 2) NOT NULL,
  "status" varchar(40) DEFAULT 'PUBLISHED' NOT NULL,
  "computed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_supplier_scorecard_period_uidx"
  ON "procurement_supplier_scorecard" ("business_id", "profile_id", "period_start", "period_end");

CREATE TABLE IF NOT EXISTS "procurement_scorecard_measure" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "scorecard_id" uuid NOT NULL REFERENCES "procurement_supplier_scorecard"("id"),
  "measure_code" varchar(60) NOT NULL,
  "event_count" integer DEFAULT 0 NOT NULL,
  "event_total" numeric(14, 4) DEFAULT '0' NOT NULL,
  "score" numeric(8, 2) NOT NULL,
  "weight" numeric(8, 2) NOT NULL,
  "weighted_score" numeric(10, 4) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_scorecard_measure_uidx"
  ON "procurement_scorecard_measure" ("scorecard_id", "measure_code");

CREATE TABLE IF NOT EXISTS "procurement_governance_proposal" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "proposal_type" varchar(40) NOT NULL,
  "status" varchar(40) DEFAULT 'PENDING' NOT NULL,
  "reason" text NOT NULL,
  "authority" varchar(200),
  "evidence_document_id" varchar(64),
  "effective_date" date,
  "review_date" date,
  "scorecard_id" uuid REFERENCES "procurement_supplier_scorecard"("id"),
  "proposed_by" uuid,
  "approved_by" uuid,
  "approved_at" timestamp with time zone,
  "rejected_at" timestamp with time zone,
  "rejection_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_governance_proposal_profile_pending_uidx"
  ON "procurement_governance_proposal" ("business_id", "profile_id", "proposal_type")
  WHERE "status" = 'PENDING';
