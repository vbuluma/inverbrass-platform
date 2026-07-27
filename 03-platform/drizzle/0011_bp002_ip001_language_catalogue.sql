/**
 * Purpose:
 * Create the language catalogue used by Party Preferred Language selectors.
 *
 * Why a follow-up migration:
 * Migration 0010 was already applied before language DDL was included.
 * This additive migration is idempotent and safe on fresh and existing DBs.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

CREATE TABLE IF NOT EXISTS "language" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(5) NOT NULL,
	"name" varchar(100) NOT NULL,
	"native_name" varchar(100) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "language_code_unique" UNIQUE("code")
);
