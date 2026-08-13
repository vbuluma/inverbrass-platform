-- BP-005 / IP-11 – Tax Compliance, Remittance & Evidence Management
-- Profile, registrations, compliance rules, periods, obligations,
-- filings, remittances, evidence, and domain events.
-- Not a tax calculation master — consumes IP-03/IP-06 liability.

CREATE TABLE IF NOT EXISTS "tax_compliance_profile" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "country_code" varchar(2) NOT NULL,
  "default_jurisdiction_code" varchar(40),
  "is_active" boolean DEFAULT true NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tax_compliance_profile_business_uidx"
  ON "tax_compliance_profile" ("business_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tax_registration" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "profile_id" uuid NOT NULL REFERENCES "tax_compliance_profile"("id"),
  "country_code" varchar(2) NOT NULL,
  "jurisdiction_code" varchar(40) NOT NULL,
  "tax_authority_code" varchar(40) NOT NULL,
  "registration_type" varchar(80) NOT NULL,
  "registration_number" varchar(120) NOT NULL,
  "tax_type_code" varchar(50),
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "is_active" boolean DEFAULT true NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE INDEX IF NOT EXISTS "tax_registration_business_idx"
  ON "tax_registration" ("business_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tax_compliance_rule" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "jurisdiction_code" varchar(40) NOT NULL,
  "country_code" varchar(2) NOT NULL,
  "tax_type_code" varchar(50) NOT NULL,
  "rule_key" varchar(120) NOT NULL,
  "version_number" integer DEFAULT 1 NOT NULL,
  "lifecycle_status" varchar(40) NOT NULL,
  "label" varchar(200) NOT NULL,
  "description" text,
  "filing_frequency" varchar(40) NOT NULL,
  "remittance_frequency" varchar(40) NOT NULL,
  "due_date_rule" jsonb,
  "requires_registration" boolean DEFAULT false NOT NULL,
  "required_evidence_types" jsonb,
  "filing_required" boolean DEFAULT true NOT NULL,
  "remittance_required" boolean DEFAULT true NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "previous_version_id" uuid,
  "payload" jsonb,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tax_compliance_rule_business_key_ver_uidx"
  ON "tax_compliance_rule" ("business_id", "rule_key", "version_number");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tax_filing_period" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "jurisdiction_code" varchar(40) NOT NULL,
  "tax_type_code" varchar(50) NOT NULL,
  "period_key" varchar(40) NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "filing_due_date" date,
  "remittance_due_date" date,
  "rule_version_id" uuid REFERENCES "tax_compliance_rule"("id"),
  "status" varchar(40) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tax_filing_period_business_idx"
  ON "tax_filing_period" ("business_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tax_obligation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "country_code" varchar(2) NOT NULL,
  "jurisdiction_code" varchar(40) NOT NULL,
  "tax_regime_code" varchar(50),
  "tax_type_code" varchar(50) NOT NULL,
  "period_key" varchar(40) NOT NULL,
  "period_start" date,
  "period_end" date,
  "snapshot_id" varchar(80),
  "resolution_id" varchar(80),
  "commercial_contract_id" uuid,
  "tax_component_id" varchar(80),
  "taxable_amount" numeric(18, 6),
  "tax_amount" numeric(18, 6),
  "currency_code" varchar(3),
  "obligation_date" date,
  "filing_due_date" date,
  "remittance_due_date" date,
  "filing_status" varchar(40),
  "remittance_status" varchar(40),
  "evidence_status" varchar(40),
  "compliance_status" varchar(40),
  "rule_version_id" uuid REFERENCES "tax_compliance_rule"("id"),
  "rule_key" varchar(120),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "metadata" jsonb,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE INDEX IF NOT EXISTS "tax_obligation_business_idx"
  ON "tax_obligation" ("business_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tax_filing" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "obligation_id" uuid NOT NULL REFERENCES "tax_obligation"("id"),
  "filing_reference" varchar(120),
  "tax_type_code" varchar(50) NOT NULL,
  "period_key" varchar(40) NOT NULL,
  "amount_declared" numeric(18, 6),
  "amount_expected" numeric(18, 6),
  "filing_date" date,
  "due_date" date,
  "status" varchar(40) NOT NULL,
  "authority_code" varchar(40),
  "acknowledgement_ref" varchar(120),
  "notes" text,
  "rule_version_id" uuid REFERENCES "tax_compliance_rule"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tax_filing_business_idx"
  ON "tax_filing" ("business_id");

CREATE INDEX IF NOT EXISTS "tax_filing_obligation_idx"
  ON "tax_filing" ("obligation_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tax_remittance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "obligation_id" uuid NOT NULL REFERENCES "tax_obligation"("id"),
  "expected_amount" numeric(18, 6),
  "amount_remitted" numeric(18, 6),
  "outstanding_amount" numeric(18, 6),
  "remittance_date" date,
  "due_date" date,
  "payment_reference" varchar(120),
  "authority_code" varchar(40),
  "status" varchar(40) NOT NULL,
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tax_remittance_business_idx"
  ON "tax_remittance" ("business_id");

CREATE INDEX IF NOT EXISTS "tax_remittance_obligation_idx"
  ON "tax_remittance" ("obligation_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tax_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "obligation_id" uuid NOT NULL REFERENCES "tax_obligation"("id"),
  "evidence_type" varchar(80) NOT NULL,
  "document_ref" varchar(500) NOT NULL,
  "uploaded_by" uuid,
  "uploaded_at" timestamptz DEFAULT now() NOT NULL,
  "description" text,
  "period_key" varchar(40),
  "status" varchar(40) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tax_evidence_business_idx"
  ON "tax_evidence" ("business_id");

CREATE INDEX IF NOT EXISTS "tax_evidence_obligation_idx"
  ON "tax_evidence" ("obligation_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tax_compliance_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "obligation_id" uuid REFERENCES "tax_obligation"("id"),
  "entity_type" varchar(80) NOT NULL,
  "entity_id" uuid NOT NULL,
  "event_type" varchar(80) NOT NULL,
  "actor_user_id" uuid,
  "before_status" varchar(40),
  "after_status" varchar(40),
  "reason" text,
  "metadata" jsonb,
  "performed_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tax_compliance_event_business_idx"
  ON "tax_compliance_event" ("business_id");

CREATE INDEX IF NOT EXISTS "tax_compliance_event_obligation_idx"
  ON "tax_compliance_event" ("obligation_id");
