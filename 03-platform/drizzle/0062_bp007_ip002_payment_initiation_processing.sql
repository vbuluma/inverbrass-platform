-- BP-007 / IP-02 – Payment Initiation & Processing
-- Payment transaction / attempt persistence only.
-- Do not create invoice, receipt, refund, settlement, or reconciliation tables.

CREATE TABLE IF NOT EXISTS "payment_transaction" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "obligation_id" uuid NOT NULL REFERENCES "payment_obligation"("id"),
  "transaction_number" varchar(80) NOT NULL,
  "method_id" uuid REFERENCES "payment_method"("id"),
  "network_id" uuid REFERENCES "payment_network"("id"),
  "provider_id" uuid REFERENCES "payment_provider"("id"),
  "channel_id" uuid REFERENCES "payment_channel"("id"),
  "method_name" varchar(100),
  "network_name" varchar(100),
  "provider_name" varchar(150),
  "channel_name" varchar(100),
  "amount" numeric(20, 6) NOT NULL,
  "currency_code" varchar(3) NOT NULL REFERENCES "currency"("code"),
  "status" varchar(50) NOT NULL,
  "capture_mode" varchar(20) NOT NULL,
  "provider_transaction_reference" varchar(160),
  "idempotency_key" varchar(180) NOT NULL,
  "initiated_at" timestamptz,
  "completed_at" timestamptz,
  "failure_code" varchar(80),
  "failure_reason" varchar(500),
  "provider_response_metadata" jsonb,
  "outcome_mismatch" boolean DEFAULT false NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_transaction_business_number_uidx"
  ON "payment_transaction" ("business_id", "transaction_number");

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_transaction_business_idempotency_uidx"
  ON "payment_transaction" ("business_id", "idempotency_key");

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_transaction_business_provider_ref_uidx"
  ON "payment_transaction" ("business_id", "provider_transaction_reference")
  WHERE "provider_transaction_reference" IS NOT NULL;

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_transaction_business_obligation_idx"
  ON "payment_transaction" ("business_id", "obligation_id");
