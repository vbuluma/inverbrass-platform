-- BP-007 / IP-06 – Refunds, Reversals & Adjustments
-- New financial events that reference an immutable original payment.
-- Do not create settlement, reconciliation, exception-queue, or collections tables.

CREATE TABLE IF NOT EXISTS "payment_refund" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "refund_number" varchar(80) NOT NULL,
  "numbering_policy_id" uuid NOT NULL,
  "original_payment_transaction_id" uuid NOT NULL REFERENCES "payment_transaction"("id"),
  "original_payment_reference" varchar(80) NOT NULL,
  "payment_obligation_id" uuid NOT NULL REFERENCES "payment_obligation"("id"),
  "original_receipt_id" uuid REFERENCES "payment_receipt"("id"),
  "originating_financial_instruction_id" uuid,
  "invoice_id" uuid REFERENCES "payment_invoice"("id"),
  "refund_type" varchar(40) NOT NULL,
  "amount" numeric(20, 6) NOT NULL,
  "currency_code" varchar(3) NOT NULL REFERENCES "currency"("code"),
  "method_id" uuid REFERENCES "payment_method"("id"),
  "network_id" uuid REFERENCES "payment_network"("id"),
  "provider_id" uuid REFERENCES "payment_provider"("id"),
  "channel_id" uuid REFERENCES "payment_channel"("id"),
  "method_name" varchar(100),
  "network_name" varchar(100),
  "provider_name" varchar(150),
  "channel_name" varchar(100),
  "status" varchar(50) NOT NULL,
  "reason" varchar(500) NOT NULL,
  "provider_refund_reference" varchar(160),
  "idempotency_key" varchar(180) NOT NULL,
  "requested_by" uuid,
  "approved_by" uuid,
  "initiated_at" timestamptz,
  "completed_at" timestamptz,
  "failure_code" varchar(80),
  "failure_reason" varchar(500),
  "provider_metadata" jsonb,
  "document_id" varchar(160),
  "document_storage_key" varchar(240),
  "document_status" varchar(40),
  "capture_mode" varchar(40) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "payment_refund_amount_positive_chk" CHECK ("amount"::numeric > 0)
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_refund_business_number_uidx"
  ON "payment_refund" ("business_id", "refund_number");

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_refund_business_idempotency_uidx"
  ON "payment_refund" ("business_id", "idempotency_key");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_refund_business_transaction_idx"
  ON "payment_refund" ("business_id", "original_payment_transaction_id");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_refund_business_obligation_idx"
  ON "payment_refund" ("business_id", "payment_obligation_id");
