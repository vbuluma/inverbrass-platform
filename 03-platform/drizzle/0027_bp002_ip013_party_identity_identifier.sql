/**
 * BP-002 / IP-013 – Identity & Regulatory Information
 * ENG-003j – Identity & Regulatory Identification Engine
 */

CREATE TABLE IF NOT EXISTS "party_identity_identifier" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "party_id" uuid NOT NULL REFERENCES "party"("id"),
  "identifier_type_code" varchar(50) NOT NULL,
  "identifier_value" varchar(500) NOT NULL,
  "issuing_country_code" varchar(2),
  "issuing_authority" varchar(200),
  "issue_date" date,
  "expiry_date" date,
  "status_code" varchar(50) NOT NULL,
  "verification_status" varchar(50) NOT NULL,
  "verification_method" varchar(50),
  "verified_by" uuid,
  "verified_at" timestamptz,
  "primary_identifier" boolean DEFAULT false NOT NULL,
  "linked_document_id" uuid REFERENCES "party_document"("id"),
  "notes" varchar(2000),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE INDEX IF NOT EXISTS "party_identity_identifier_party_idx"
  ON "party_identity_identifier" ("business_id", "party_id")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "party_identity_identifier_business_type_value_uidx"
  ON "party_identity_identifier" ("business_id", "identifier_type_code", "identifier_value")
  WHERE "deleted_at" IS NULL;
