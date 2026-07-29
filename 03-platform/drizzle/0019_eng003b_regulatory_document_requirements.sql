/**
 * ENG-003b – Localization & Regulatory Engine
 * Regulatory rule sets and document requirements (configuration).
 */

CREATE TABLE IF NOT EXISTS "regulatory_rule_set" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(80) NOT NULL UNIQUE,
  "name" varchar(200) NOT NULL,
  "country_code" varchar(2) NOT NULL,
  "party_type_code" varchar(50) NOT NULL,
  "industry_code" varchar(50),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "regulatory_document_requirement" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rule_set_code" varchar(80) NOT NULL,
  "document_type_code" varchar(50) NOT NULL,
  "requirement_level" varchar(20) NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "regulatory_document_requirement_rule_set_document_uidx"
  ON "regulatory_document_requirement" ("rule_set_code", "document_type_code");
