-- BP-004 Service & Engagement — Final Remediation
-- Case SLA columns + activity overdue emission guard.

ALTER TABLE "crm_case"
  ADD COLUMN IF NOT EXISTS "subcategory_code" varchar(50);

ALTER TABLE "crm_case"
  ADD COLUMN IF NOT EXISTS "sla_policy_id" uuid;

ALTER TABLE "crm_case"
  ADD COLUMN IF NOT EXISTS "escalation_level" integer DEFAULT 0 NOT NULL;

ALTER TABLE "crm_case"
  ADD COLUMN IF NOT EXISTS "sla_at_risk_at" timestamp with time zone;

--> statement-breakpoint

ALTER TABLE "crm_activity"
  ADD COLUMN IF NOT EXISTS "overdue_event_emitted_at" timestamp with time zone;
