-- BP-006 / IP-03 – Delivery, Inspection & Service Completion
-- Operational delivery/inspection facts. Do not store a competing fulfilled
-- quantity on sales_order_line. Inventory movement is not executed here.

CREATE TABLE IF NOT EXISTS "sales_delivery_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "sales_order_id" uuid NOT NULL REFERENCES "sales_order"("id"),
  "sales_order_line_id" uuid NOT NULL REFERENCES "sales_order_line"("id"),
  "event_type" varchar(30) NOT NULL,
  "status" varchar(40) NOT NULL,
  "claimed_quantity" numeric(20, 6) NOT NULL,
  "delivered_at" timestamptz DEFAULT now() NOT NULL,
  "recorded_by" uuid NOT NULL,
  "recorded_at" timestamptz DEFAULT now() NOT NULL,
  "notes" varchar(2000),
  "evidence_note" varchar(2000),
  "evidence_ref" varchar(500),
  "completed_by" uuid,
  "completed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "sales_delivery_event_order_idx"
  ON "sales_delivery_event" ("business_id", "sales_order_id");

CREATE INDEX IF NOT EXISTS "sales_delivery_event_line_idx"
  ON "sales_delivery_event" ("business_id", "sales_order_line_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "sales_inspection_outcome" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "sales_order_id" uuid NOT NULL REFERENCES "sales_order"("id"),
  "sales_order_line_id" uuid NOT NULL REFERENCES "sales_order_line"("id"),
  "delivery_event_id" uuid NOT NULL REFERENCES "sales_delivery_event"("id"),
  "accepted_quantity" numeric(20, 6) NOT NULL,
  "rejected_quantity" numeric(20, 6) DEFAULT 0 NOT NULL,
  "comments" varchar(2000),
  "rejection_reason_code" varchar(40),
  "quality_finding_code" varchar(40),
  "evidence_note" varchar(2000),
  "evidence_ref" varchar(500),
  "inspected_by" uuid NOT NULL,
  "inspected_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "sales_inspection_outcome_event_uidx"
  ON "sales_inspection_outcome" ("delivery_event_id");

CREATE INDEX IF NOT EXISTS "sales_inspection_outcome_order_idx"
  ON "sales_inspection_outcome" ("business_id", "sales_order_id");
