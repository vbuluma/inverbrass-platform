-- BP-001 Foundation Alignment
-- Store the temporary proposed business name captured at Platform Registration.
-- No Business row is created until Business Registration starts from Platform Home.

ALTER TABLE "platform_user"
ADD COLUMN IF NOT EXISTS "proposed_business_name" varchar(200);
