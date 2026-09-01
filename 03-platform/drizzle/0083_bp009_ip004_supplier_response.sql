-- BP-009 / IP-04 – Supplier response depth (lines, payment terms, clarifications)
-- Does not add evaluation scoring, opening UI, or purchase orders.

ALTER TABLE "procurement_supplier_quote"
  ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
  ADD COLUMN IF NOT EXISTS "comments" varchar(4000),
  ADD COLUMN IF NOT EXISTS "delivery_lead_days" integer,
  ADD COLUMN IF NOT EXISTS "warranty_notes" varchar(2000),
  ADD COLUMN IF NOT EXISTS "year1_amount" numeric(20, 6),
  ADD COLUMN IF NOT EXISTS "tcv_amount" numeric(20, 6),
  ADD COLUMN IF NOT EXISTS "tco_amount" numeric(20, 6),
  ADD COLUMN IF NOT EXISTS "captured_on_behalf" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(80);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "procurement_supplier_quote_idempotency_uidx"
  ON "procurement_supplier_quote" ("event_id", "profile_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

--> statement-breakpoint

ALTER TABLE "procurement_sourcing_invitation"
  ADD COLUMN IF NOT EXISTS "opened_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "revoked_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "response_status" varchar(30) DEFAULT 'INVITED' NOT NULL,
  ADD COLUMN IF NOT EXISTS "token_expires_at" timestamptz;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_supplier_quote_line" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "quote_id" uuid NOT NULL REFERENCES "procurement_supplier_quote"("id"),
  "sequence" integer NOT NULL,
  "description" varchar(500) NOT NULL,
  "quantity" numeric(20, 6) NOT NULL,
  "unit_price" numeric(20, 6) NOT NULL,
  "tax_rate" numeric(8, 4) DEFAULT '0' NOT NULL,
  "line_total" numeric(20, 6) NOT NULL
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "procurement_supplier_quote_line_quote_idx"
  ON "procurement_supplier_quote_line" ("quote_id", "sequence");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_supplier_quote_payment_term" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "quote_id" uuid NOT NULL REFERENCES "procurement_supplier_quote"("id"),
  "sequence" integer NOT NULL,
  "milestone_name" varchar(200) NOT NULL,
  "percentage" numeric(8, 2) NOT NULL,
  "amount" numeric(20, 6),
  "trigger_event" varchar(200),
  "due_period_days" integer,
  "comments" varchar(1000)
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "procurement_supplier_quote_payment_term_quote_idx"
  ON "procurement_supplier_quote_payment_term" ("quote_id", "sequence");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procurement_sourcing_clarification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "event_id" uuid NOT NULL REFERENCES "procurement_sourcing_event"("id"),
  "profile_id" uuid REFERENCES "procurement_profile"("id"),
  "question" varchar(4000) NOT NULL,
  "answer" varchar(4000),
  "asked_by" varchar(120),
  "answered_by" uuid,
  "is_broadcast" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "answered_at" timestamptz
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "procurement_sourcing_clarification_event_idx"
  ON "procurement_sourcing_clarification" ("event_id", "created_at");
