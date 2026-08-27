-- BP-005 / IP-08 – Commercial Governance
-- Governance policy, versioned commercial rules, event history, override requests.
-- Not a pricing/tax/product master.

CREATE TABLE IF NOT EXISTS "commercial_governance_policy" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "approval_required" boolean DEFAULT true NOT NULL,
  "requires_segregation_of_duties" boolean DEFAULT true NOT NULL,
  "required_approver_count" integer DEFAULT 1 NOT NULL,
  "approval_threshold_amount" numeric(18, 6),
  "approval_threshold_currency" varchar(3),
  "allow_override" boolean DEFAULT false NOT NULL,
  "override_requires_approval" boolean DEFAULT true NOT NULL,
  "mandatory_justification" boolean DEFAULT true NOT NULL,
  "material_field_paths" jsonb,
  "is_active" boolean DEFAULT true NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "commercial_governance_policy_business_uidx"
  ON "commercial_governance_policy" ("business_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "commercial_rule_version" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "rule_key" varchar(120) NOT NULL,
  "rule_type" varchar(50) NOT NULL,
  "version_number" integer DEFAULT 1 NOT NULL,
  "lifecycle_status" varchar(40) NOT NULL,
  "label" varchar(200) NOT NULL,
  "description" text,
  "payload" jsonb NOT NULL,
  "currency_code" varchar(3),
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "previous_version_id" uuid,
  "superseded_by_version_id" uuid,
  "approval_required" boolean DEFAULT true NOT NULL,
  "submitted_by" uuid,
  "submitted_at" timestamptz,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "rejected_by" uuid,
  "rejected_at" timestamptz,
  "rejection_reason" text,
  "activated_by" uuid,
  "activated_at" timestamptz,
  "suspended_by" uuid,
  "suspended_at" timestamptz,
  "suspension_reason" text,
  "retired_by" uuid,
  "retired_at" timestamptz,
  "retirement_reason" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL,
  "metadata" jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS "commercial_rule_version_business_key_ver_uidx"
  ON "commercial_rule_version" ("business_id", "rule_key", "version_number")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "commercial_rule_version_business_status_idx"
  ON "commercial_rule_version" ("business_id", "lifecycle_status");

CREATE INDEX IF NOT EXISTS "commercial_rule_version_business_key_idx"
  ON "commercial_rule_version" ("business_id", "rule_key");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "commercial_governance_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "rule_version_id" uuid NOT NULL REFERENCES "commercial_rule_version"("id"),
  "event_type" varchar(80) NOT NULL,
  "actor_user_id" uuid,
  "before_status" varchar(40),
  "after_status" varchar(40),
  "before_payload" jsonb,
  "after_payload" jsonb,
  "reason" text,
  "approval_status" varchar(40),
  "metadata" jsonb,
  "performed_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "commercial_governance_event_rule_idx"
  ON "commercial_governance_event" ("business_id", "rule_version_id", "performed_at");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "commercial_override_request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "rule_version_id" uuid REFERENCES "commercial_rule_version"("id"),
  "snapshot_id" varchar(80),
  "resolution_id" varchar(80),
  "status" varchar(40) NOT NULL,
  "reason" text NOT NULL,
  "original_value" jsonb NOT NULL,
  "overridden_value" jsonb NOT NULL,
  "applicable_rule_key" varchar(120),
  "requested_by" uuid NOT NULL,
  "requested_at" timestamptz DEFAULT now() NOT NULL,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "rejected_by" uuid,
  "rejected_at" timestamptz,
  "rejection_reason" text,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "commercial_override_request_business_status_idx"
  ON "commercial_override_request" ("business_id", "status");
