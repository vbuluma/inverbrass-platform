-- BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
-- Catalogue tables existed in TypeScript only; this is their first migration.
-- Do not create payment-transaction execution tables (IP-02).

CREATE TABLE IF NOT EXISTS "payment_method" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(30) NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "customer_label" varchar(100),
  "icon_code" varchar(100),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "requires_rail" boolean DEFAULT true NOT NULL,
  "requires_provider" boolean DEFAULT true NOT NULL,
  "requires_channel" boolean DEFAULT true NOT NULL,
  "enablement_flag" varchar(50),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "payment_method_code_unique" UNIQUE ("code")
);

--> statement-breakpoint

ALTER TABLE "payment_method" ADD COLUMN IF NOT EXISTS "customer_label" varchar(100);
ALTER TABLE "payment_method" ADD COLUMN IF NOT EXISTS "requires_rail" boolean DEFAULT true NOT NULL;
ALTER TABLE "payment_method" ADD COLUMN IF NOT EXISTS "requires_provider" boolean DEFAULT true NOT NULL;
ALTER TABLE "payment_method" ADD COLUMN IF NOT EXISTS "requires_channel" boolean DEFAULT true NOT NULL;
ALTER TABLE "payment_method" ADD COLUMN IF NOT EXISTS "enablement_flag" varchar(50);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "payment_network" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_method_id" uuid NOT NULL REFERENCES "payment_method"("id"),
  "code" varchar(50) NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "customer_label" varchar(100),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "payment_network_code_unique" UNIQUE ("code")
);

--> statement-breakpoint

ALTER TABLE "payment_network" ADD COLUMN IF NOT EXISTS "customer_label" varchar(100);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "payment_provider" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_network_id" uuid NOT NULL REFERENCES "payment_network"("id"),
  "code" varchar(50) NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" varchar(500),
  "integration_ref" varchar(120),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "payment_provider_code_unique" UNIQUE ("code")
);

--> statement-breakpoint

ALTER TABLE "payment_provider" ADD COLUMN IF NOT EXISTS "integration_ref" varchar(120);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "payment_channel" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_provider_id" uuid NOT NULL REFERENCES "payment_provider"("id"),
  "code" varchar(50) NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "customer_label" varchar(100),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "payment_channel_code_unique" UNIQUE ("code")
);

--> statement-breakpoint

ALTER TABLE "payment_channel" ADD COLUMN IF NOT EXISTS "customer_label" varchar(100);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "payment_channel_capability" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_channel_id" uuid NOT NULL REFERENCES "payment_channel"("id"),
  "payment_provider_id" uuid NOT NULL REFERENCES "payment_provider"("id"),
  "min_amount" numeric(20, 6),
  "max_amount" numeric(20, 6),
  "daily_limit" numeric(20, 6),
  "transaction_limit" numeric(20, 6),
  "supported_currencies" jsonb,
  "supports_initiation" boolean DEFAULT true NOT NULL,
  "supports_refund" boolean DEFAULT false NOT NULL,
  "supports_status_query" boolean DEFAULT false NOT NULL,
  "is_available" boolean DEFAULT true NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_channel_capability_channel_uidx"
  ON "payment_channel_capability" ("payment_channel_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "payment_obligation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "obligation_number" varchar(80) NOT NULL,
  "sales_order_id" uuid NOT NULL REFERENCES "sales_order"("id"),
  "order_number" varchar(80) NOT NULL,
  "customer_id" uuid REFERENCES "party"("id"),
  "currency_code" varchar(3) NOT NULL REFERENCES "currency"("code"),
  "amount_due" numeric(20, 6) NOT NULL,
  "paid_amount" numeric(20, 6) DEFAULT '0' NOT NULL,
  "outstanding_amount" numeric(20, 6) NOT NULL,
  "payment_status" varchar(50) DEFAULT 'NOT_STARTED' NOT NULL,
  "financial_instruction_type" varchar(40) NOT NULL,
  "commercial_contract_id" varchar(120) NOT NULL,
  "snapshot_id" uuid NOT NULL,
  "payment_ready_contract_ref" varchar(160) NOT NULL,
  "line_breakdown" jsonb,
  "payment_ready_contract_payload" jsonb,
  "provider_transaction_reference" varchar(160),
  "idempotency_key" varchar(180) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_obligation_business_number_uidx"
  ON "payment_obligation" ("business_id", "obligation_number");

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_obligation_business_instruction_uidx"
  ON "payment_obligation" ("business_id", "sales_order_id", "financial_instruction_type");

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_obligation_business_idempotency_uidx"
  ON "payment_obligation" ("business_id", "idempotency_key");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_obligation_business_idx"
  ON "payment_obligation" ("business_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "payment_idempotency" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "idempotency_key" varchar(180) NOT NULL,
  "operation_type" varchar(60) NOT NULL,
  "resource_type" varchar(60) NOT NULL,
  "resource_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payment_idempotency_business_operation_key_uidx"
  ON "payment_idempotency" ("business_id", "operation_type", "idempotency_key");
