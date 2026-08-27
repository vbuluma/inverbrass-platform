-- BP-007 / IP-05 – Receipting & Payment Evidence
-- Immutable evidence of a SUCCESSFUL payment transaction.
-- Numbering is ENG-003b. Document production is ENG-007.
-- Storage is ENG-015. Delivery is ENG-009.
-- Do not create refund, settlement, reconciliation, or collections tables.

CREATE TABLE IF NOT EXISTS "payment_receipt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "receipt_number" varchar(80) NOT NULL,
  "numbering_policy_id" uuid NOT NULL,
  "payment_transaction_id" uuid NOT NULL REFERENCES "payment_transaction"("id"),
  "payment_obligation_id" uuid NOT NULL REFERENCES "payment_obligation"("id"),
  "customer_id" uuid REFERENCES "party"("id"),
  "sales_order_id" uuid NOT NULL,
  "order_number" varchar(80) NOT NULL,
  "invoice_id" uuid REFERENCES "payment_invoice"("id"),
  "invoice_number" varchar(80),
  "currency_code" varchar(3) NOT NULL REFERENCES "currency"("code"),
  "amount" numeric(20, 6) NOT NULL,
  "payment_date_time" timestamptz NOT NULL,
  "method_id" uuid REFERENCES "payment_method"("id"),
  "network_id" uuid REFERENCES "payment_network"("id"),
  "provider_id" uuid REFERENCES "payment_provider"("id"),
  "channel_id" uuid REFERENCES "payment_channel"("id"),
  "method_name" varchar(100),
  "network_name" varchar(100),
  "provider_name" varchar(150),
  "channel_name" varchar(100),
  "provider_transaction_reference" varchar(160),
  "internal_payment_transaction_number" varchar(80) NOT NULL,
  "document_id" varchar(160),
  "document_storage_key" varchar(240),
  "document_status" varchar(40),
  "status" varchar(50) NOT NULL,
  "delivery_status" varchar(40) DEFAULT 'NONE' NOT NULL,
  "original_receipt_id" uuid,
  "idempotency_key" varchar(180) NOT NULL,
  "evidence" jsonb,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "payment_receipt_amount_positive_chk" CHECK ("amount"::numeric > 0)
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_receipt_business_number_uidx"
  ON "payment_receipt" ("business_id", "receipt_number");

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_receipt_business_transaction_uidx"
  ON "payment_receipt" ("business_id", "payment_transaction_id");

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_receipt_business_idempotency_uidx"
  ON "payment_receipt" ("business_id", "idempotency_key");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_receipt_business_obligation_idx"
  ON "payment_receipt" ("business_id", "payment_obligation_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "payment_receipt_delivery" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "receipt_id" uuid NOT NULL REFERENCES "payment_receipt"("id"),
  "channel" varchar(40) NOT NULL,
  "status" varchar(40) NOT NULL,
  "failure_reason" varchar(500),
  "requested_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_receipt_delivery_business_receipt_idx"
  ON "payment_receipt_delivery" ("business_id", "receipt_id");
