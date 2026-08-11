/**
 * Purpose:
 * BP-004 / IP-06 refinements — lightweight meeting minutes on appointments.
 *
 * Adds structured notes fields (not full IP-07 visit reports).
 */

ALTER TABLE "crm_appointment"
  ADD COLUMN IF NOT EXISTS "meeting_notes" varchar(8000);
--> statement-breakpoint
ALTER TABLE "crm_appointment"
  ADD COLUMN IF NOT EXISTS "decisions" varchar(4000);
--> statement-breakpoint
ALTER TABLE "crm_appointment"
  ADD COLUMN IF NOT EXISTS "action_items_summary" varchar(4000);
--> statement-breakpoint
ALTER TABLE "crm_appointment"
  ADD COLUMN IF NOT EXISTS "recurrence_rule_id" uuid;
--> statement-breakpoint
ALTER TABLE "crm_appointment"
  ADD COLUMN IF NOT EXISTS "occurrence_index" integer;
--> statement-breakpoint
ALTER TABLE "crm_appointment"
  ADD COLUMN IF NOT EXISTS "external_calendar_sync_key" varchar(200);
