-- BP-006 / IP-04 – Amendments, Cancellation & Returns
-- Instruction records only. Do not execute refunds or stock movement.

CREATE TABLE IF NOT EXISTS "sales_disposition_instruction" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "sales_order_id" uuid NOT NULL REFERENCES "sales_order"("id"),
  "sales_order_line_id" uuid REFERENCES "sales_order_line"("id"),
  "instruction_type" varchar(40) NOT NULL,
  "status" varchar(30) NOT NULL,
  "quantity" numeric(20, 6) NOT NULL,
  "reason_code" varchar(40) NOT NULL,
  "comments" varchar(2000),
  "financial_instruction_emitted" boolean DEFAULT true NOT NULL,
  "stock_instruction_emitted" boolean DEFAULT false NOT NULL,
  "refund_executed" boolean DEFAULT false NOT NULL,
  "stock_moved" boolean DEFAULT false NOT NULL,
  "submitted_by" uuid NOT NULL,
  "submitted_at" timestamptz DEFAULT now() NOT NULL,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "rejected_by" uuid,
  "rejected_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "sales_disposition_instruction_order_idx"
  ON "sales_disposition_instruction" ("business_id", "sales_order_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "sales_order_amendment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "sales_order_id" uuid NOT NULL REFERENCES "sales_order"("id"),
  "sales_order_line_id" uuid NOT NULL REFERENCES "sales_order_line"("id"),
  "version_number" integer NOT NULL,
  "status" varchar(30) NOT NULL,
  "reason" varchar(2000) NOT NULL,
  "previous_quantity" numeric(20, 6) NOT NULL,
  "proposed_quantity" numeric(20, 6) NOT NULL,
  "previous_expected_amount" numeric(20, 6) NOT NULL,
  "proposed_expected_amount" numeric(20, 6) NOT NULL,
  "previous_commercial_contract_id" varchar(120),
  "proposed_commercial_contract_id" varchar(120) NOT NULL,
  "previous_snapshot_id" uuid,
  "proposed_snapshot_id" uuid NOT NULL,
  "snapshot_payload" jsonb NOT NULL,
  "contract_payload" jsonb NOT NULL,
  "proposed_by" uuid NOT NULL,
  "proposed_at" timestamptz DEFAULT now() NOT NULL,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "sales_order_amendment_order_idx"
  ON "sales_order_amendment" ("business_id", "sales_order_id");
