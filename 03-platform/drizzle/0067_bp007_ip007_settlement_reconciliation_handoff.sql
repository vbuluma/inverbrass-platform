-- BP-007 / IP-07 – Settlement & Reconciliation Handoff
-- Tracks provider settlement independently of payment success.
-- Does not create statement, matching, cashbook, collections, or GL tables.

CREATE TABLE IF NOT EXISTS "payment_settlement" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "payment_transaction_id" uuid NOT NULL REFERENCES "payment_transaction"("id"),
  "payment_obligation_id" uuid NOT NULL REFERENCES "payment_obligation"("id"),
  "settlement_status" varchar(50) NOT NULL,
  "expected_amount" numeric(20, 6) NOT NULL,
  "received_amount" numeric(20, 6),
  "variance_amount" numeric(20, 6),
  "currency_code" varchar(3) NOT NULL REFERENCES "currency"("code"),
  "settlement_reference" varchar(160),
  "settlement_batch_reference" varchar(160),
  "settlement_date" timestamptz,
  "received_at" timestamptz,
  "confirmed_at" timestamptz,
  "method_id" uuid REFERENCES "payment_method"("id"),
  "network_id" uuid REFERENCES "payment_network"("id"),
  "provider_id" uuid REFERENCES "payment_provider"("id"),
  "channel_id" uuid REFERENCES "payment_channel"("id"),
  "method_name" varchar(100),
  "network_name" varchar(100),
  "provider_name" varchar(150),
  "channel_name" varchar(100),
  "provider_transaction_reference" varchar(160),
  "provider_settlement_metadata" jsonb,
  "exception_flag" boolean DEFAULT false NOT NULL,
  "exception_code" varchar(80),
  "exception_reason" varchar(500),
  "idempotency_key" varchar(180) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_settlement_business_transaction_uidx"
  ON "payment_settlement" ("business_id", "payment_transaction_id");

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_settlement_business_idempotency_uidx"
  ON "payment_settlement" ("business_id", "idempotency_key");

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_settlement_business_reference_uidx"
  ON "payment_settlement" ("business_id", "settlement_reference")
  WHERE "settlement_reference" IS NOT NULL;

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_settlement_business_batch_idx"
  ON "payment_settlement" ("business_id", "settlement_batch_reference");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_settlement_business_obligation_idx"
  ON "payment_settlement" ("business_id", "payment_obligation_id");
