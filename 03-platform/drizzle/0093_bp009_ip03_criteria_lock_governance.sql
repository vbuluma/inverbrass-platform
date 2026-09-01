-- BP-009 IP-03/IP-05 — criteria lock, committee constitution, bid access audit, award approval policy

ALTER TABLE procurement_sourcing_event
  ADD COLUMN IF NOT EXISTS committee_constituted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS committee_constituted_by UUID,
  ADD COLUMN IF NOT EXISTS criteria_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS criteria_locked_by UUID,
  ADD COLUMN IF NOT EXISTS criteria_snapshot_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS criteria_snapshot_json TEXT,
  ADD COLUMN IF NOT EXISTS award_approval_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS award_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS award_submitted_by UUID,
  ADD COLUMN IF NOT EXISTS award_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS award_approved_by UUID;

ALTER TABLE procurement_sourcing_control
  ADD COLUMN IF NOT EXISTS award_requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bid_submission_count_visible BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS procurement_sourcing_bid_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business(id),
  event_id UUID NOT NULL REFERENCES procurement_sourcing_event(id),
  profile_id UUID REFERENCES procurement_profile(id),
  actor_user_id UUID,
  action VARCHAR(60) NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS procurement_sourcing_bid_access_log_event_idx
  ON procurement_sourcing_bid_access_log (event_id, accessed_at);
