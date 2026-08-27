-- BP-007 / IP-04 – Billing, Invoicing & Credit Sales
-- Formal customer invoice on an existing payment obligation.
-- Numbering policy is ENG-003b. Document production is ENG-007.
-- Do not create receipt, refund, settlement, reconciliation, or collections tables.

CREATE TABLE IF NOT EXISTS "document_numbering_policy" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid REFERENCES "business"("id"),
  "document_type" varchar(40) NOT NULL,
  "policy_code" varchar(80) NOT NULL,
  "prefix" varchar(20) NOT NULL,
  "next_value" integer DEFAULT 0 NOT NULL,
  "padding" integer DEFAULT 6 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "document_numbering_policy_code_uidx"
  ON "document_numbering_policy" ("policy_code");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "invoice_payment_term" (
  "code" varchar(40) PRIMARY KEY NOT NULL,
  "name" varchar(120) NOT NULL,
  "net_days" integer NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "payment_invoice" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "obligation_id" uuid NOT NULL REFERENCES "payment_obligation"("id"),
  "sales_order_id" uuid NOT NULL,
  "order_number" varchar(80) NOT NULL,
  "customer_id" uuid REFERENCES "party"("id"),
  "invoice_number" varchar(80) NOT NULL,
  "numbering_policy_id" uuid NOT NULL,
  "currency_code" varchar(3) NOT NULL REFERENCES "currency"("code"),
  "invoice_amount" numeric(20, 6) NOT NULL,
  "paid_amount" numeric(20, 6) DEFAULT '0' NOT NULL,
  "outstanding_amount" numeric(20, 6) NOT NULL,
  "opening_paid_amount" numeric(20, 6) DEFAULT '0' NOT NULL,
  "amount_due_snapshot" numeric(20, 6) NOT NULL,
  "commercial_contract_id" varchar(120) NOT NULL,
  "snapshot_id" uuid NOT NULL,
  "payment_term_code" varchar(40) NOT NULL REFERENCES "invoice_payment_term"("code"),
  "issue_date" timestamptz,
  "due_date" timestamptz,
  "status" varchar(50) NOT NULL,
  "document_id" varchar(160),
  "document_status" varchar(40),
  "cancellation_reason" varchar(500),
  "cancelled_at" timestamptz,
  "cancelled_by" uuid,
  "idempotency_key" varchar(180) NOT NULL,
  "provenance" jsonb,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "payment_invoice_amount_positive_chk" CHECK ("invoice_amount"::numeric > 0)
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_invoice_business_number_uidx"
  ON "payment_invoice" ("business_id", "invoice_number");

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_invoice_business_idempotency_uidx"
  ON "payment_invoice" ("business_id", "idempotency_key");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_invoice_business_obligation_idx"
  ON "payment_invoice" ("business_id", "obligation_id");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_invoice_business_status_idx"
  ON "payment_invoice" ("business_id", "status");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "invoice_adjustment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "invoice_id" uuid NOT NULL REFERENCES "payment_invoice"("id"),
  "adjustment_type" varchar(40) NOT NULL,
  "status" varchar(40) NOT NULL,
  "amount" numeric(20, 6) NOT NULL,
  "currency_code" varchar(3) NOT NULL REFERENCES "currency"("code"),
  "reason" varchar(500) NOT NULL,
  "handed_off_to_ip06" varchar(10) DEFAULT 'NO' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "invoice_adjustment_business_invoice_idx"
  ON "invoice_adjustment" ("business_id", "invoice_id");
