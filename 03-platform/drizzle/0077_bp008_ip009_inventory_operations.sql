-- BP-008 / IP-09 – Inventory Operations, Exceptions & Controls
-- Operational incidents record problems. They do not store stock quantities.

CREATE TABLE IF NOT EXISTS "inventory_ops_incident_type" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(80) NOT NULL UNIQUE,
  "name" varchar(120) NOT NULL,
  "description" varchar(500),
  "default_severity" varchar(20) DEFAULT 'MEDIUM' NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_ops_incident_type_severity_chk"
    CHECK ("default_severity" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_ops_incident" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "incident_number" varchar(40) NOT NULL,
  "incident_type" varchar(80) NOT NULL,
  "severity" varchar(20) NOT NULL,
  "status" varchar(30) DEFAULT 'OPEN' NOT NULL,
  "source_type" varchar(40) NOT NULL,
  "source_id" varchar(80) NOT NULL,
  "stock_item_id" uuid REFERENCES "stock_item"("id"),
  "location_id" uuid REFERENCES "inventory_location"("id"),
  "description" varchar(1000) NOT NULL,
  "detected_at" timestamptz DEFAULT now() NOT NULL,
  "investigation_started_at" timestamptz,
  "resolved_at" timestamptz,
  "closed_at" timestamptz,
  "resolution_action" varchar(60),
  "resolution_reason" varchar(1000),
  "resolution_notes" varchar(1000),
  "linked_adjustment_id" uuid,
  "maker_id" uuid,
  "checker_id" uuid,
  "idempotency_key" varchar(160),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "inventory_ops_incident_severity_chk"
    CHECK ("severity" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  CONSTRAINT "inventory_ops_incident_status_chk"
    CHECK (
      "status" IN (
        'OPEN',
        'INVESTIGATING',
        'APPROVAL_PENDING',
        'RESOLVED',
        'REJECTED',
        'CLOSED'
      )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_ops_incident_number_uidx"
  ON "inventory_ops_incident" ("business_id", "incident_number");

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_ops_incident_active_source_uidx"
  ON "inventory_ops_incident" (
    "business_id",
    "source_type",
    "source_id",
    "incident_type"
  )
  WHERE "status" IN ('OPEN', 'INVESTIGATING', 'APPROVAL_PENDING');

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_ops_incident_idempotency_uidx"
  ON "inventory_ops_incident" ("business_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "inventory_ops_incident_business_status_idx"
  ON "inventory_ops_incident" ("business_id", "status");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_ops_incident_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "incident_id" uuid NOT NULL REFERENCES "inventory_ops_incident"("id"),
  "event_type" varchar(60) NOT NULL,
  "note" varchar(1000),
  "actor_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "inventory_ops_incident_event_incident_idx"
  ON "inventory_ops_incident_event" ("business_id", "incident_id");
