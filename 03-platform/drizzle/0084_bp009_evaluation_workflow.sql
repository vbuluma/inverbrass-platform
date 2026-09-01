-- BP-009 evaluation workflow: tender close, committee, criteria, due diligence

ALTER TABLE "procurement_sourcing_event"
  ADD COLUMN IF NOT EXISTS "evaluation_stage" varchar(40) DEFAULT 'BIDDING' NOT NULL,
  ADD COLUMN IF NOT EXISTS "closed_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "evaluation_started_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "due_diligence_required" boolean,
  ADD COLUMN IF NOT EXISTS "due_diligence_location_verified" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "due_diligence_staff_verified" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "due_diligence_legal_verified" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "due_diligence_other_notes" varchar(2000),
  ADD COLUMN IF NOT EXISTS "due_diligence_recorded_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "procurement_sourcing_evaluation_committee" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "event_id" uuid NOT NULL REFERENCES "procurement_sourcing_event"("id"),
  "sequence" integer NOT NULL,
  "member_name" varchar(200) NOT NULL,
  "role_label" varchar(120),
  "user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid
);

CREATE INDEX IF NOT EXISTS "procurement_sourcing_evaluation_committee_event_idx"
  ON "procurement_sourcing_evaluation_committee" ("event_id", "sequence");
