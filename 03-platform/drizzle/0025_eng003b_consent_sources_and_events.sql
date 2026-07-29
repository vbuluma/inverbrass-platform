/**
 * ENG-003b — Consent Sources & Event-driven Consent Capture (UX-001.2)
 */

CREATE TABLE IF NOT EXISTS "consent_source" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(80) NOT NULL,
  "name" varchar(200) NOT NULL,
  "country_code" varchar(2),
  "description" varchar(500),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "consent_source_country_code_uidx"
  ON "consent_source" ("country_code", "code");

CREATE TABLE IF NOT EXISTS "party_consent_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id"),
  "party_id" uuid NOT NULL REFERENCES "party"("id"),
  "consent_type_code" varchar(50) NOT NULL,
  "status_code" varchar(50) NOT NULL,
  "consent_date" timestamptz NOT NULL,
  "consent_source_code" varchar(80) NOT NULL,
  "captured_by" uuid,
  "evidence" varchar(500),
  "ip_address" varchar(45),
  "browser" varchar(200),
  "device" varchar(200),
  "reference_id" varchar(200),
  "notes" varchar(2000),
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "party_consent_event_party_idx"
  ON "party_consent_event" ("business_id", "party_id", "consent_date" DESC);
