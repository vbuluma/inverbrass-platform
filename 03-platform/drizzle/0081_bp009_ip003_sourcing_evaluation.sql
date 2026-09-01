-- BP-009 / IP-03 – Sourcing evaluation outcome
-- Quote versions preserve initial vs final. Awards are not purchase orders.

CREATE TABLE IF NOT EXISTS "procurement_sourcing_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "event_number" varchar(40) NOT NULL,
  "rfx_type" varchar(20) DEFAULT 'RFQ' NOT NULL,
  "title" varchar(200) NOT NULL,
  "status" varchar(30) DEFAULT 'ISSUED' NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "recommendation" varchar(4000),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_sourcing_event_number_uidx"
  ON "procurement_sourcing_event" ("business_id", "event_number");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "procurement_sourcing_event_business_status_idx"
  ON "procurement_sourcing_event" ("business_id", "status");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_sourcing_event_pr" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "event_id" uuid NOT NULL REFERENCES "procurement_sourcing_event"("id"),
  "purchase_request_id" uuid NOT NULL REFERENCES "procurement_purchase_request"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_sourcing_event_pr_uidx"
  ON "procurement_sourcing_event_pr" ("event_id", "purchase_request_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_sourcing_invitation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "event_id" uuid NOT NULL REFERENCES "procurement_sourcing_event"("id"),
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "access_token" varchar(80) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_sourcing_invitation_uidx"
  ON "procurement_sourcing_invitation" ("event_id", "profile_id");

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_sourcing_invitation_token_uidx"
  ON "procurement_sourcing_invitation" ("access_token");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_supplier_quote" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "event_id" uuid NOT NULL REFERENCES "procurement_sourcing_event"("id"),
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "version" integer NOT NULL,
  "amount" numeric(20, 6) NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "submitted_at" timestamptz DEFAULT now() NOT NULL,
  "submitted_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_supplier_quote_version_uidx"
  ON "procurement_supplier_quote" ("event_id", "profile_id", "version");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "procurement_supplier_quote_event_idx"
  ON "procurement_supplier_quote" ("business_id", "event_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_award" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "event_id" uuid NOT NULL REFERENCES "procurement_sourcing_event"("id"),
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "awarded_amount" numeric(20, 6) NOT NULL,
  "allocated_budget_amount" numeric(20, 6) NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_award_event_profile_uidx"
  ON "procurement_award" ("event_id", "profile_id");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "procurement_award_event_idx"
  ON "procurement_award" ("business_id", "event_id");
