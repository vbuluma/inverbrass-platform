/**
 * Purpose:
 * Create the shared currency reference catalogue (ISO 4217).
 *
 * Why this migration exists:
 * The TypeScript currency schema was exported and used by IP-006 / seed logic,
 * but earlier migrations (0000–0003) never emitted CREATE TABLE "currency".
 * Country stores currency_code as an independent varchar reference; currency
 * remains a separate shared master table (no FK coupling required here).
 *
 * Implementation Package:
 * IP-006 repair — currency reference table
 */

CREATE TABLE "currency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(3) NOT NULL,
	"name" varchar(100) NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"decimal_places" integer DEFAULT 2 NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "currency_code_unique" UNIQUE("code")
);
