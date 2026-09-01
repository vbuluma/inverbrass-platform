-- BP-009 IP-11: multi-rater evaluations + supplier self-eval control
-- BP-009 IP-12: read-path indexes for procurement analytics (no fact tables)

ALTER TABLE "procurement_performance_control"
  ADD COLUMN IF NOT EXISTS "supplier_self_eval_required" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "include_supplier_self_eval_in_average" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "procurement_performance_evaluation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "evaluator_type" varchar(20) NOT NULL,
  "evaluator_user_id" uuid,
  "evaluator_label" varchar(200),
  "status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
  "composite_score" numeric(8, 2),
  "submitted_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_performance_eval_internal_uidx"
  ON "procurement_performance_evaluation" (
    "business_id",
    "profile_id",
    "period_start",
    "period_end",
    "evaluator_type",
    "evaluator_user_id"
  );

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_performance_eval_supplier_uidx"
  ON "procurement_performance_evaluation" (
    "business_id",
    "profile_id",
    "period_start",
    "period_end",
    "evaluator_type"
  )
  WHERE "evaluator_type" = 'SUPPLIER';

CREATE TABLE IF NOT EXISTS "procurement_performance_evaluation_rating" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "evaluation_id" uuid NOT NULL REFERENCES "procurement_performance_evaluation"("id"),
  "measure_code" varchar(60) NOT NULL,
  "score" numeric(8, 2) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_performance_eval_rating_uidx"
  ON "procurement_performance_evaluation_rating" ("evaluation_id", "measure_code");

-- IP-12 analytics read-path indexes
CREATE INDEX IF NOT EXISTS "procurement_po_business_profile_issued_idx"
  ON "procurement_purchase_order" ("business_id", "profile_id", "issued_at");

CREATE INDEX IF NOT EXISTS "procurement_po_business_status_idx"
  ON "procurement_purchase_order" ("business_id", "status");

CREATE INDEX IF NOT EXISTS "procurement_invoice_business_status_idx"
  ON "procurement_supplier_invoice" ("business_id", "status", "match_outcome");

CREATE INDEX IF NOT EXISTS "procurement_pr_business_unit_idx"
  ON "procurement_purchase_request" ("business_id", "business_unit_code");

CREATE INDEX IF NOT EXISTS "procurement_sourcing_business_category_idx"
  ON "procurement_sourcing_event" ("business_id", "category_code");

CREATE INDEX IF NOT EXISTS "procurement_contract_business_end_date_idx"
  ON "procurement_contract" ("business_id", "end_date", "status");
