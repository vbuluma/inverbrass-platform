-- BP-009 IP-10 Procurement Exceptions & Controls

CREATE TABLE IF NOT EXISTS "procurement_exception_control" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "high_severity_requires_approval" boolean DEFAULT true NOT NULL,
  "duplicate_invoice_requires_decision" boolean DEFAULT true NOT NULL,
  "default_sla_days" integer DEFAULT 5 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_exception_control_business_uidx"
  ON "procurement_exception_control" ("business_id");

CREATE TABLE IF NOT EXISTS "procurement_exception_type" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "code" varchar(60) NOT NULL,
  "name" varchar(120) NOT NULL,
  "description" varchar(500),
  "default_severity" varchar(20) DEFAULT 'MEDIUM' NOT NULL,
  "requires_approval_on_close" boolean DEFAULT false NOT NULL,
  "display_order" integer DEFAULT 100 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_exception_type_business_code_uidx"
  ON "procurement_exception_type" ("business_id", "code");
CREATE INDEX IF NOT EXISTS "procurement_exception_type_business_active_idx"
  ON "procurement_exception_type" ("business_id", "is_active");

CREATE TABLE IF NOT EXISTS "procurement_exception" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "exception_number" varchar(40) NOT NULL,
  "exception_type_code" varchar(60) NOT NULL,
  "severity" varchar(20) NOT NULL,
  "status" varchar(40) DEFAULT 'OPEN' NOT NULL,
  "title" varchar(200) NOT NULL,
  "description" varchar(4000),
  "evidence_document_id" varchar(120),
  "raised_from" varchar(30) NOT NULL,
  "source_key" varchar(160),
  "profile_id" uuid REFERENCES "procurement_profile"("id"),
  "owner_user_id" uuid,
  "resolution_notes" varchar(4000),
  "resolution_decision" varchar(2000),
  "variance_accepted_by" uuid,
  "requires_approval" boolean DEFAULT false NOT NULL,
  "approved_at" timestamp with time zone,
  "approved_by" uuid,
  "due_at" timestamp with time zone,
  "closed_at" timestamp with time zone,
  "closed_by" uuid,
  "cancelled_at" timestamp with time zone,
  "cancelled_by" uuid,
  "cancellation_reason" varchar(2000),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_exception_business_number_uidx"
  ON "procurement_exception" ("business_id", "exception_number");
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_exception_source_key_uidx"
  ON "procurement_exception" ("business_id", "source_key")
  WHERE "source_key" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "procurement_exception_business_status_idx"
  ON "procurement_exception" ("business_id", "status");
CREATE INDEX IF NOT EXISTS "procurement_exception_owner_idx"
  ON "procurement_exception" ("business_id", "owner_user_id", "status");

CREATE TABLE IF NOT EXISTS "procurement_exception_link" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "exception_id" uuid NOT NULL REFERENCES "procurement_exception"("id"),
  "object_type" varchar(40) NOT NULL,
  "object_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "procurement_exception_link_exception_idx"
  ON "procurement_exception_link" ("exception_id");
CREATE INDEX IF NOT EXISTS "procurement_exception_link_object_idx"
  ON "procurement_exception_link" ("business_id", "object_type", "object_id");

CREATE TABLE IF NOT EXISTS "procurement_exception_action" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "exception_id" uuid NOT NULL REFERENCES "procurement_exception"("id"),
  "action_type" varchar(40) NOT NULL,
  "actor_user_id" uuid,
  "notes" varchar(4000),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
