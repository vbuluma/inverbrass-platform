/**
 * ENG-003b – Localization & Regulatory Engine
 * Identifier type catalogue and required identifier configuration.
 */

CREATE TABLE IF NOT EXISTS "identifier_type" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL UNIQUE,
  "name" varchar(200) NOT NULL,
  "description" varchar(500),
  "validation_pattern" varchar(500),
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "required_identifier" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rule_set_code" varchar(80) NOT NULL,
  "identifier_type_code" varchar(50) NOT NULL,
  "requirement_level" varchar(20) NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "required_identifier_rule_set_type_uidx"
  ON "required_identifier" ("rule_set_code", "identifier_type_code");
