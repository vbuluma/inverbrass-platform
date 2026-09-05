-- SL-CUS-001 / BP-006 — sales operation idempotency (CREATE_DIRECT_SALE)
-- Mirrors payment_idempotency uniqueness scope: (business_id, operation_type, idempotency_key)

CREATE TABLE IF NOT EXISTS "sales_idempotency" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "idempotency_key" varchar(180) NOT NULL,
  "operation_type" varchar(60) NOT NULL,
  "payload_hash" varchar(128) NOT NULL,
  "resource_type" varchar(60) NOT NULL,
  "resource_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "sales_idempotency_business_operation_key_uidx"
  ON "sales_idempotency" ("business_id", "operation_type", "idempotency_key");
