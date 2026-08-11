-- BP-004 / IP-11 – Campaign Management (Phase 11.1 Foundation)
-- Campaign master and member tables

CREATE TABLE IF NOT EXISTS "campaign" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "campaign_number" varchar(80) NOT NULL,
  "name" varchar(200) NOT NULL,
  "campaign_type" varchar(50) NOT NULL,
  "status" varchar(50) NOT NULL,
  "start_at" timestamptz,
  "end_at" timestamptz,
  "budget_amount" numeric(20, 6) DEFAULT 0 NOT NULL,
  "actual_cost" numeric(20, 6) DEFAULT 0 NOT NULL,
  "currency_code" varchar(3) NOT NULL REFERENCES "currency"("code"),
  "objective" varchar(2000),
  "owner_user_id" uuid,
  "party_group_id" uuid REFERENCES "party_group"("id"),
  "expected_response_count" integer DEFAULT 0 NOT NULL,
  "notes" varchar(4000),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "campaign_business_number_uidx"
  ON "campaign" ("business_id", "campaign_number")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "campaign_business_status_idx"
  ON "campaign" ("business_id", "status")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "campaign_business_type_idx"
  ON "campaign" ("business_id", "campaign_type")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "campaign_business_party_group_idx"
  ON "campaign" ("business_id", "party_group_id")
  WHERE "deleted_at" IS NULL AND "party_group_id" IS NOT NULL;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "campaign_member" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "campaign_id" uuid NOT NULL REFERENCES "campaign"("id"),
  "party_id" uuid NOT NULL REFERENCES "party"("id"),
  "member_status" varchar(50) NOT NULL,
  "lead_id" uuid,
  "opportunity_id" uuid,
  "consent_checked_at" timestamptz,
  "consent_granted" boolean DEFAULT false NOT NULL,
  "outreach_channel" varchar(50),
  "responded_at" timestamptz,
  "converted_at" timestamptz,
  "notes" varchar(2000),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS "campaign_member_campaign_party_uidx"
  ON "campaign_member" ("campaign_id", "party_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "campaign_member_business_campaign_idx"
  ON "campaign_member" ("business_id", "campaign_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "campaign_member_business_party_idx"
  ON "campaign_member" ("business_id", "party_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "campaign_member_business_status_idx"
  ON "campaign_member" ("business_id", "member_status")
  WHERE "deleted_at" IS NULL;
