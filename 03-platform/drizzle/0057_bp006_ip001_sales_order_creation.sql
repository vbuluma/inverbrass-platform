-- BP-006 / IP-01 – Sales & Order Creation
-- Evolves the BP-004 sales_order handoff stub into the BP-006 order owner.
-- Direct sales need a nullable quotation_id. Commercial values are copied
-- from the consumed BP-005 contract (snapshot is not stored by BP-005).

ALTER TABLE "sales_order"
  ALTER COLUMN "quotation_id" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "source_type" varchar(30) DEFAULT 'QUOTATION' NOT NULL,
  ADD COLUMN IF NOT EXISTS "order_date" timestamptz DEFAULT now() NOT NULL,
  ADD COLUMN IF NOT EXISTS "expected_amount" numeric(20, 6) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "commercial_contract_id" varchar(120),
  ADD COLUMN IF NOT EXISTS "snapshot_id" uuid,
  ADD COLUMN IF NOT EXISTS "confirmation_requires_sod" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "submitted_by" uuid,
  ADD COLUMN IF NOT EXISTS "submitted_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "confirmed_by" uuid,
  ADD COLUMN IF NOT EXISTS "confirmed_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "confirmation_rejected_by" uuid,
  ADD COLUMN IF NOT EXISTS "confirmation_rejected_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "confirmation_rejected_reason" varchar(1000),
  ADD COLUMN IF NOT EXISTS "payment_status" varchar(50) DEFAULT 'NOT_RECORDED' NOT NULL,
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;

--> statement-breakpoint

UPDATE "sales_order"
SET "expected_amount" = "grand_total"
WHERE "expected_amount" = 0 AND "grand_total" <> 0;

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "sales_order_quotation_uidx"
  ON "sales_order" ("business_id", "quotation_id")
  WHERE "quotation_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "sales_order_business_status_idx"
  ON "sales_order" ("business_id", "status");

CREATE INDEX IF NOT EXISTS "sales_order_business_party_idx"
  ON "sales_order" ("business_id", "party_id");

--> statement-breakpoint

ALTER TABLE "sales_order_line"
  ADD COLUMN IF NOT EXISTS "line_type" varchar(30) DEFAULT 'SERVICE' NOT NULL,
  ADD COLUMN IF NOT EXISTS "agreed_unit_value" numeric(20, 6) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "commercial_line_amount" numeric(20, 6) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "currency_code" varchar(3) DEFAULT 'KES' NOT NULL,
  ADD COLUMN IF NOT EXISTS "snapshot_id" uuid,
  ADD COLUMN IF NOT EXISTS "commercial_contract_id" varchar(120),
  ADD COLUMN IF NOT EXISTS "commercial_breakdown" jsonb;

--> statement-breakpoint

UPDATE "sales_order_line"
SET "commercial_line_amount" = "line_total"
WHERE "commercial_line_amount" = 0 AND "line_total" <> 0;

UPDATE "sales_order_line" AS line
SET "currency_code" = header."currency_code",
    "agreed_unit_value" = line."unit_price"
FROM "sales_order" AS header
WHERE line."sales_order_id" = header."id";

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "sales_order_commercial_link" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "sales_order_id" uuid NOT NULL REFERENCES "sales_order"("id"),
  "sales_order_line_id" uuid REFERENCES "sales_order_line"("id"),
  "snapshot_id" uuid NOT NULL,
  "commercial_contract_id" varchar(120) NOT NULL,
  "expected_amount_id" varchar(160),
  "expected_payable" numeric(20, 6) NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "integrity_hash" varchar(160) NOT NULL,
  "snapshot_payload" jsonb NOT NULL,
  "contract_payload" jsonb NOT NULL,
  "provenance" jsonb,
  "consumer_ref" varchar(200),
  "consumed_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "sales_order_commercial_link_line_uidx"
  ON "sales_order_commercial_link" ("sales_order_id", "sales_order_line_id")
  WHERE "sales_order_line_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "sales_order_commercial_link_order_idx"
  ON "sales_order_commercial_link" ("business_id", "sales_order_id");
