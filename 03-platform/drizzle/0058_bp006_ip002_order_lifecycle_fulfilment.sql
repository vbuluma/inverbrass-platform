-- BP-006 / IP-02 – Order Lifecycle & Fulfilment
-- Completion SoD metadata only. Operational accepted/rejected/outstanding
-- quantities are derived from IP-03 and are not stored here.

ALTER TABLE "sales_order"
  ADD COLUMN IF NOT EXISTS "completion_requires_sod" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "completion_submitted_by" uuid,
  ADD COLUMN IF NOT EXISTS "completion_submitted_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "completed_by" uuid,
  ADD COLUMN IF NOT EXISTS "completed_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "completion_rejected_by" uuid,
  ADD COLUMN IF NOT EXISTS "completion_rejected_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "completion_rejected_reason" varchar(1000);
