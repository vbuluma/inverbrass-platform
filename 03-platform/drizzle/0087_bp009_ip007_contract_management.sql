-- BP-009 IP-07 Contract Management

CREATE TABLE IF NOT EXISTS "procurement_contract_control" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "requires_approval" boolean DEFAULT true NOT NULL,
  "requires_execution_evidence" boolean DEFAULT true NOT NULL,
  "material_amendment_threshold" numeric(20, 6),
  "expiry_warning_days" integer DEFAULT 90 NOT NULL,
  "direct_contract_from_pr_enabled" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_contract_control_business_uidx"
  ON "procurement_contract_control" ("business_id");

CREATE TABLE IF NOT EXISTS "procurement_contract_type" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL UNIQUE,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "procurement_contract" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "contract_number" varchar(40) NOT NULL,
  "profile_id" uuid NOT NULL REFERENCES "procurement_profile"("id"),
  "contract_type_code" varchar(50) NOT NULL,
  "title" varchar(200) NOT NULL,
  "description" varchar(4000),
  "status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
  "source_type" varchar(30) NOT NULL,
  "purchase_request_id" uuid REFERENCES "procurement_purchase_request"("id"),
  "sourcing_event_id" uuid REFERENCES "procurement_sourcing_event"("id"),
  "award_id" uuid REFERENCES "procurement_award"("id"),
  "winning_quote_id" uuid REFERENCES "procurement_supplier_quote"("id"),
  "currency_code" varchar(3) NOT NULL,
  "value_type" varchar(20) DEFAULT 'FIXED' NOT NULL,
  "total_value" numeric(20, 6),
  "annual_value" numeric(20, 6),
  "call_off_ceiling" numeric(20, 6),
  "category_code" varchar(50),
  "owner_user_id" uuid,
  "owner_name" varchar(200),
  "current_version_id" uuid,
  "start_date" date,
  "end_date" date,
  "execution_date" date,
  "renewal_option" boolean DEFAULT false NOT NULL,
  "notice_period_days" integer,
  "call_offs_permitted" boolean DEFAULT true NOT NULL,
  "execution_evidence_document_id" uuid,
  "submitted_at" timestamp with time zone,
  "submitted_by" uuid,
  "approved_at" timestamp with time zone,
  "approved_by" uuid,
  "rejected_at" timestamp with time zone,
  "rejected_by" uuid,
  "rejection_reason" varchar(2000),
  "activated_at" timestamp with time zone,
  "activated_by" uuid,
  "suspended_at" timestamp with time zone,
  "suspended_by" uuid,
  "suspension_reason" varchar(2000),
  "terminated_at" timestamp with time zone,
  "terminated_by" uuid,
  "termination_reason" varchar(2000),
  "closed_at" timestamp with time zone,
  "closed_by" uuid,
  "closure_reason" varchar(2000),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_contract_business_number_uidx"
  ON "procurement_contract" ("business_id", "contract_number");
CREATE INDEX IF NOT EXISTS "procurement_contract_business_status_idx"
  ON "procurement_contract" ("business_id", "status");
CREATE INDEX IF NOT EXISTS "procurement_contract_profile_idx"
  ON "procurement_contract" ("business_id", "profile_id");

CREATE TABLE IF NOT EXISTS "procurement_contract_version" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "contract_id" uuid NOT NULL REFERENCES "procurement_contract"("id"),
  "version_number" integer NOT NULL,
  "status" varchar(30) NOT NULL,
  "change_reason" varchar(2000),
  "effective_date" date,
  "value_type" varchar(20) NOT NULL,
  "total_value" numeric(20, 6),
  "annual_value" numeric(20, 6),
  "call_off_ceiling" numeric(20, 6),
  "start_date" date,
  "end_date" date,
  "renewal_option" boolean DEFAULT false NOT NULL,
  "notice_period_days" integer,
  "call_offs_permitted" boolean DEFAULT true NOT NULL,
  "superseded_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS "procurement_contract_version_uidx"
  ON "procurement_contract_version" ("contract_id", "version_number");

CREATE TABLE IF NOT EXISTS "procurement_contract_period_value" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "version_id" uuid NOT NULL REFERENCES "procurement_contract_version"("id"),
  "period_year" integer NOT NULL,
  "sequence" integer NOT NULL,
  "amount" numeric(20, 6) NOT NULL,
  "description" varchar(500)
);
CREATE INDEX IF NOT EXISTS "procurement_contract_period_value_version_idx"
  ON "procurement_contract_period_value" ("version_id", "sequence");

CREATE TABLE IF NOT EXISTS "procurement_contract_payment_term" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "version_id" uuid NOT NULL REFERENCES "procurement_contract_version"("id"),
  "sequence" integer NOT NULL,
  "milestone_name" varchar(200) NOT NULL,
  "percentage" numeric(8, 2) NOT NULL,
  "amount" numeric(20, 6),
  "trigger_event" varchar(200),
  "due_period_days" integer,
  "comments" varchar(1000)
);
CREATE INDEX IF NOT EXISTS "procurement_contract_payment_term_version_idx"
  ON "procurement_contract_payment_term" ("version_id", "sequence");

ALTER TABLE "procurement_purchase_order"
  ADD COLUMN IF NOT EXISTS "contract_id" uuid REFERENCES "procurement_contract"("id"),
  ADD COLUMN IF NOT EXISTS "contract_version_id" uuid REFERENCES "procurement_contract_version"("id"),
  ADD COLUMN IF NOT EXISTS "call_off_reference" varchar(80);

CREATE INDEX IF NOT EXISTS "procurement_po_contract_idx"
  ON "procurement_purchase_order" ("business_id", "contract_id");
