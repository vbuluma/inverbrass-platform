-- IP-006 refinement: upgrade column-based configuration / progress when present.
-- WHY: Environments that already applied the initial IP-006 migration keep data
-- while moving to metadata settings and progress audit fields.
-- Safe no-op when tables were created with the refined 0002 shape.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_configuration'
      AND column_name = 'cash_enabled'
  ) THEN
    ALTER TABLE "business_configuration" ADD COLUMN IF NOT EXISTS "settings" jsonb;

    UPDATE "business_configuration"
    SET "settings" = jsonb_build_object(
      'paymentMethods', jsonb_build_object(
        'cashEnabled', "cash_enabled",
        'mobileMoneyEnabled', "mobile_money_enabled",
        'bankTransferEnabled', "bank_transfer_enabled",
        'cardEnabled', "card_enabled",
        'creditSalesEnabled', "credit_sales_enabled"
      ),
      'receipt', jsonb_build_object(
        'receiptPrefix', "receipt_prefix",
        'receiptFooter', "receipt_footer",
        'showLogoOnReceipt', "show_logo_on_receipt"
      ),
      'tax', jsonb_build_object(
        'taxEnabled', "tax_enabled",
        'defaultTaxRate', "default_tax_rate"::text
      ),
      'features', jsonb_build_object(
        'aiAssistantEnabled', "ai_assistant_enabled",
        'loyaltyProgrammeEnabled', "loyalty_programme_enabled"
      )
    )
    WHERE "settings" IS NULL;

    ALTER TABLE "business_configuration" ALTER COLUMN "settings" SET NOT NULL;

    ALTER TABLE "business_configuration" DROP COLUMN IF EXISTS "cash_enabled";
    ALTER TABLE "business_configuration" DROP COLUMN IF EXISTS "mobile_money_enabled";
    ALTER TABLE "business_configuration" DROP COLUMN IF EXISTS "bank_transfer_enabled";
    ALTER TABLE "business_configuration" DROP COLUMN IF EXISTS "card_enabled";
    ALTER TABLE "business_configuration" DROP COLUMN IF EXISTS "credit_sales_enabled";
    ALTER TABLE "business_configuration" DROP COLUMN IF EXISTS "receipt_prefix";
    ALTER TABLE "business_configuration" DROP COLUMN IF EXISTS "receipt_footer";
    ALTER TABLE "business_configuration" DROP COLUMN IF EXISTS "show_logo_on_receipt";
    ALTER TABLE "business_configuration" DROP COLUMN IF EXISTS "tax_enabled";
    ALTER TABLE "business_configuration" DROP COLUMN IF EXISTS "default_tax_rate";
    ALTER TABLE "business_configuration" DROP COLUMN IF EXISTS "ai_assistant_enabled";
    ALTER TABLE "business_configuration" DROP COLUMN IF EXISTS "loyalty_programme_enabled";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "business_setup_progress" ADD COLUMN IF NOT EXISTS "last_completed_step" varchar(50);
--> statement-breakpoint
ALTER TABLE "business_setup_progress" ADD COLUMN IF NOT EXISTS "completed_by" uuid;
--> statement-breakpoint
ALTER TABLE "business_setup_progress" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "business_setup_progress" ADD COLUMN IF NOT EXISTS "wizard_version" varchar(20);
--> statement-breakpoint
UPDATE "business_setup_progress"
SET "wizard_version" = '1.0.0'
WHERE "wizard_version" IS NULL;
--> statement-breakpoint
ALTER TABLE "business_setup_progress" ALTER COLUMN "wizard_version" SET NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'business_setup_progress_completed_by_platform_user_id_fk'
  ) THEN
    ALTER TABLE "business_setup_progress"
      ADD CONSTRAINT "business_setup_progress_completed_by_platform_user_id_fk"
      FOREIGN KEY ("completed_by") REFERENCES "public"."platform_user"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
