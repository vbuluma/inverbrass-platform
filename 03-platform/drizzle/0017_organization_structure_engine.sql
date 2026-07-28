/**
 * Purpose:
 * Refactor IP-005 Branch model into Organization Structure Engine (ENG-003c).
 * Renames branch_type → organizational_unit_type, organization_branch → organizational_unit.
 */

ALTER TABLE IF EXISTS "branch_type" RENAME TO "organizational_unit_type";
--> statement-breakpoint
ALTER TABLE IF EXISTS "organization_branch" RENAME TO "organizational_unit";
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizational_unit' AND column_name = 'branch_code'
  ) THEN
    ALTER TABLE "organizational_unit" RENAME COLUMN "branch_code" TO "unit_code";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizational_unit' AND column_name = 'branch_name'
  ) THEN
    ALTER TABLE "organizational_unit" RENAME COLUMN "branch_name" TO "unit_name";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizational_unit' AND column_name = 'branch_type_code'
  ) THEN
    ALTER TABLE "organizational_unit" RENAME COLUMN "branch_type_code" TO "organizational_unit_type_code";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizational_unit' AND column_name = 'parent_branch_id'
  ) THEN
    ALTER TABLE "organizational_unit" RENAME COLUMN "parent_branch_id" TO "parent_organizational_unit_id";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "organizational_unit" ADD COLUMN IF NOT EXISTS "country_code" varchar(2);
--> statement-breakpoint
ALTER TABLE "organizational_unit" ADD COLUMN IF NOT EXISTS "latitude" numeric(10, 7);
--> statement-breakpoint
ALTER TABLE "organizational_unit" ADD COLUMN IF NOT EXISTS "longitude" numeric(10, 7);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'organization_branch_parent_branch_id_organization_branch_id_fk'
  ) THEN
    ALTER TABLE "organizational_unit"
      DROP CONSTRAINT "organization_branch_parent_branch_id_organization_branch_id_fk";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'organizational_unit_parent_organizational_unit_id_fk'
  ) THEN
    ALTER TABLE "organizational_unit"
      ADD CONSTRAINT "organizational_unit_parent_organizational_unit_id_fk"
      FOREIGN KEY ("parent_organizational_unit_id") REFERENCES "public"."organizational_unit"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS "organization_branch_code_uidx";
--> statement-breakpoint
DROP INDEX IF EXISTS "organization_branch_head_office_uidx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organizational_unit_code_uidx"
  ON "organizational_unit" ("organization_party_id", "unit_code")
  WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organizational_unit_head_office_uidx"
  ON "organizational_unit" ("organization_party_id")
  WHERE "is_head_office" = true AND "deleted_at" IS NULL AND "status_code" = 'ACTIVE';
