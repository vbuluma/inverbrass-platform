-- BP-007 / IP-03 – Partial, Split Payment & Allocation
-- Allocation of successful payment transactions to a payment obligation.
-- Do not create invoice, receipt, refund, settlement, or reconciliation tables.

CREATE TABLE IF NOT EXISTS "payment_allocation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "obligation_id" uuid NOT NULL REFERENCES "payment_obligation"("id"),
  "payment_transaction_id" uuid NOT NULL REFERENCES "payment_transaction"("id"),
  "allocation_number" varchar(80) NOT NULL,
  "target_type" varchar(40) DEFAULT 'OBLIGATION' NOT NULL,
  "allocated_amount" numeric(20, 6) NOT NULL,
  "currency_code" varchar(3) NOT NULL REFERENCES "currency"("code"),
  "status" varchar(50) NOT NULL,
  "idempotency_key" varchar(180) NOT NULL,
  "reason" varchar(500),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "payment_allocation_amount_positive_chk" CHECK ("allocated_amount"::numeric > 0)
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_allocation_business_number_uidx"
  ON "payment_allocation" ("business_id", "allocation_number");

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_allocation_business_idempotency_uidx"
  ON "payment_allocation" ("business_id", "idempotency_key");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_allocation_business_obligation_idx"
  ON "payment_allocation" ("business_id", "obligation_id");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_allocation_business_transaction_idx"
  ON "payment_allocation" ("business_id", "payment_transaction_id");
