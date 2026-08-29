-- BP-008 / IP-02 remediation – persist entered vs base inbound quantities.
-- Conversion factors come from IP-01 stock_item configuration, not from a new UOM engine.

ALTER TABLE "inventory_receipt_line"
  ADD COLUMN IF NOT EXISTS "base_quantity" numeric(20, 6),
  ADD COLUMN IF NOT EXISTS "conversion_factor" numeric(20, 6);

--> statement-breakpoint

UPDATE "inventory_receipt_line"
SET
  "base_quantity" = COALESCE("base_quantity", "quantity"),
  "conversion_factor" = COALESCE("conversion_factor", 1);

--> statement-breakpoint

ALTER TABLE "inventory_receipt_line"
  ALTER COLUMN "base_quantity" SET NOT NULL,
  ALTER COLUMN "conversion_factor" SET NOT NULL;

--> statement-breakpoint

ALTER TABLE "inventory_opening_balance_line"
  ADD COLUMN IF NOT EXISTS "base_quantity" numeric(20, 6),
  ADD COLUMN IF NOT EXISTS "conversion_factor" numeric(20, 6);

--> statement-breakpoint

UPDATE "inventory_opening_balance_line"
SET
  "base_quantity" = COALESCE("base_quantity", "quantity"),
  "conversion_factor" = COALESCE("conversion_factor", 1);

--> statement-breakpoint

ALTER TABLE "inventory_opening_balance_line"
  ALTER COLUMN "base_quantity" SET NOT NULL,
  ALTER COLUMN "conversion_factor" SET NOT NULL;
