-- BP-009 IP-05: bid opening, phase scores, award quote reference

ALTER TABLE "procurement_sourcing_event"
  ADD COLUMN IF NOT EXISTS "bids_opened_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "bids_opened_by" uuid,
  ADD COLUMN IF NOT EXISTS "bids_opening_approved_by" uuid,
  ADD COLUMN IF NOT EXISTS "recommended_profile_ids" varchar(500),
  ADD COLUMN IF NOT EXISTS "award_override_reason" varchar(2000);

ALTER TABLE "procurement_award"
  ADD COLUMN IF NOT EXISTS "winning_quote_id" uuid REFERENCES "procurement_supplier_quote"("id"),
  ADD COLUMN IF NOT EXISTS "override_reason" varchar(2000);

CREATE TABLE IF NOT EXISTS "procurement_sourcing_phase_score" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "event_id" uuid NOT NULL REFERENCES "procurement_sourcing_event"("id"),
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "phase_code" varchar(30) NOT NULL,
  "score" numeric(8, 2) NOT NULL,
  "scored_by" uuid,
  "scored_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_sourcing_phase_score_uidx"
  ON "procurement_sourcing_phase_score" ("event_id", "profile_id", "phase_code");

CREATE INDEX IF NOT EXISTS "procurement_sourcing_phase_score_event_idx"
  ON "procurement_sourcing_phase_score" ("event_id", "profile_id");
