-- BP-004 / IP-013 – CRM Governance & Administration
-- Party-keyed governance (crm_record_id deferred to IP-01), checklist foundation,
-- merge proposal queue, SLA / business hours / holiday / approval matrix stubs.

CREATE TABLE IF NOT EXISTS "crm_governance_status" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(80) NOT NULL,
  "name" varchar(200) NOT NULL,
  "description" varchar(500),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_governance_status_code_uidx"
  ON "crm_governance_status" ("code");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "crm_governance_checklist_definition" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "crm_governance_checklist_business_code_uidx"
  ON "crm_governance_checklist_definition" ("business_id", "code");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "crm_governance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "party_id" uuid NOT NULL REFERENCES "party"("id"),
  "owner_user_id" uuid,
  "relationship_manager_user_id" uuid,
  "steward_user_id" uuid,
  "governance_status" varchar(80) NOT NULL,
  "readiness_score" numeric(5, 2) DEFAULT 0 NOT NULL,
  "last_validation_date" timestamptz,
  "is_locked" boolean DEFAULT false NOT NULL,
  "activation_blocked" boolean DEFAULT false NOT NULL,
  "notes" varchar(4000),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_governance_business_party_uidx"
  ON "crm_governance" ("business_id", "party_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "crm_governance_business_status_idx"
  ON "crm_governance" ("business_id", "governance_status")
  WHERE "deleted_at" IS NULL;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "crm_governance_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "crm_governance_id" uuid NOT NULL REFERENCES "crm_governance"("id"),
  "change_type" varchar(100) NOT NULL,
  "old_value" varchar(4000),
  "new_value" varchar(4000),
  "changed_by" uuid,
  "change_date" timestamptz DEFAULT now() NOT NULL,
  "metadata" jsonb
);

CREATE INDEX IF NOT EXISTS "crm_governance_history_governance_idx"
  ON "crm_governance_history" ("crm_governance_id", "change_date");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "crm_governance_ownership_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "governance_id" uuid NOT NULL REFERENCES "crm_governance"("id"),
  "role_code" varchar(40) NOT NULL,
  "user_id" uuid NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz,
  "changed_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "crm_governance_ownership_history_gov_idx"
  ON "crm_governance_ownership_history" ("governance_id", "effective_from");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "crm_merge_proposal" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "survivor_party_id" uuid NOT NULL REFERENCES "party"("id"),
  "duplicate_party_id" uuid NOT NULL REFERENCES "party"("id"),
  "status" varchar(40) DEFAULT 'PENDING' NOT NULL,
  "match_reason" varchar(1000),
  "field_resolution_json" jsonb,
  "proposed_by" uuid,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "executed_at" timestamptz,
  "notes" varchar(4000),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "crm_merge_proposal_business_status_idx"
  ON "crm_merge_proposal" ("business_id", "status")
  WHERE "deleted_at" IS NULL;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "crm_sla_policy" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "entity_type_code" varchar(50) NOT NULL,
  "priority_code" varchar(50),
  "name" varchar(200) NOT NULL,
  "first_response_target_hours" integer,
  "resolution_target_hours" integer NOT NULL,
  "pause_reason_codes" jsonb,
  "escalation_enabled" boolean DEFAULT true NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_sla_policy_business_entity_priority_uidx"
  ON "crm_sla_policy" ("business_id", "entity_type_code", COALESCE("priority_code", ''));

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "crm_business_hours" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "day_of_week" integer NOT NULL,
  "open_time" varchar(5) NOT NULL,
  "close_time" varchar(5) NOT NULL,
  "is_closed" boolean DEFAULT false NOT NULL,
  "timezone" varchar(80) DEFAULT 'UTC' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_business_hours_business_day_uidx"
  ON "crm_business_hours" ("business_id", "day_of_week");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "crm_holiday_calendar" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "holiday_date" date NOT NULL,
  "name" varchar(200) NOT NULL,
  "is_recurring" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_holiday_calendar_business_date_uidx"
  ON "crm_holiday_calendar" ("business_id", "holiday_date");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "crm_approval_matrix" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "action_code" varchar(50) NOT NULL,
  "min_role_code" varchar(80) NOT NULL,
  "requires_dual_approval" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_approval_matrix_business_action_uidx"
  ON "crm_approval_matrix" ("business_id", "action_code");
