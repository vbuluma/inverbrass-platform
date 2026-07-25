-- BP-001 Foundation Stabilization — Stage 1 platform-owned authentication
-- WHY: Application authentication uses PostgreSQL as the source of truth.
-- Supabase remains PostgreSQL / Storage / Realtime infrastructure only.
-- Passwords are stored only as bcrypt hashes on user_security_profile.

ALTER TABLE "user_security_profile"
ADD COLUMN IF NOT EXISTS "password_hash" varchar(255);

-- Email remains in the model but is optional for registration and login.
ALTER TABLE "platform_user"
ALTER COLUMN "email" DROP NOT NULL;

-- Legacy Supabase Auth bridge column — nullable for platform-owned Stage 1 auth.
ALTER TABLE "platform_user"
ALTER COLUMN "auth_user_id" DROP NOT NULL;
