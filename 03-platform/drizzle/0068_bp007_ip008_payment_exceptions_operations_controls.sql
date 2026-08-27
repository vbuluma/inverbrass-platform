-- BP-007 / IP-08 – Payment Exceptions, Operations & Controls
-- Operational exception records for unresolved payment situations.
-- Does not create statement, matching, collections, or GL tables.

CREATE TABLE IF NOT EXISTS "payment_exception" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "exception_number" varchar(80) NOT NULL,
  "numbering_policy_id" uuid NOT NULL,
  "payment_transaction_id" uuid NOT NULL REFERENCES "payment_transaction"("id"),
  "payment_obligation_id" uuid NOT NULL REFERENCES "payment_obligation"("id"),
  "exception_type" varchar(80) NOT NULL,
  "severity" varchar(20) NOT NULL,
  "status" varchar(40) NOT NULL,
  "reason" varchar(500) NOT NULL,
  "detected_at" timestamptz DEFAULT now() NOT NULL,
  "detected_by" uuid,
  "assigned_to" uuid,
  "resolved_by" uuid,
  "resolution_code" varchar(80),
  "resolution_notes" varchar(1000),
  "resolution_evidence" varchar(240),
  "approval_status" varchar(40),
  "requested_by" uuid,
  "approved_by" uuid,
  "proposed_resolution_code" varchar(80),
  "proposed_resolution_notes" varchar(1000),
  "retry_of_transaction_id" uuid REFERENCES "payment_transaction"("id"),
  "idempotency_key" varchar(180) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_exception_business_number_uidx"
  ON "payment_exception" ("business_id", "exception_number");

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_exception_business_idempotency_uidx"
  ON "payment_exception" ("business_id", "idempotency_key");

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_exception_open_type_uidx"
  ON "payment_exception" ("business_id", "payment_transaction_id", "exception_type")
  WHERE "status" IN ('OPEN', 'INVESTIGATING');

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_exception_business_status_idx"
  ON "payment_exception" ("business_id", "status");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_exception_business_type_idx"
  ON "payment_exception" ("business_id", "exception_type");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_exception_business_obligation_idx"
  ON "payment_exception" ("business_id", "payment_obligation_id");
