/**
 * BP-002 / IP-007 – Document & Compliance platform refactor
 * - Rename ENG-003b regulatory_document_requirement → required_document
 * - Add verification_method catalogue
 * - Add party_document.verification_method_code
 */

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'regulatory_document_requirement'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'required_document'
  ) THEN
    ALTER TABLE "regulatory_document_requirement" RENAME TO "required_document";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'regulatory_document_requirement_rule_set_document_uidx'
  ) THEN
    ALTER INDEX "regulatory_document_requirement_rule_set_document_uidx"
      RENAME TO "required_document_rule_set_document_uidx";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "required_document" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rule_set_code" varchar(80) NOT NULL,
  "document_type_code" varchar(50) NOT NULL,
  "requirement_level" varchar(20) NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "required_document_rule_set_document_uidx"
  ON "required_document" ("rule_set_code", "document_type_code");

CREATE TABLE IF NOT EXISTS "verification_method" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL UNIQUE,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "party_document"
  ADD COLUMN IF NOT EXISTS "verification_method_code" varchar(50);
