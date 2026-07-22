CREATE TABLE "country" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(2) NOT NULL,
	"iso3_code" varchar(3) NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone_code" varchar(10) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"timezone_code" varchar(100) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "country_code_unique" UNIQUE("code"),
	CONSTRAINT "country_iso3_code_unique" UNIQUE("iso3_code")
);
--> statement-breakpoint
CREATE TABLE "business_membership_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_membership_status_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "permission_action" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permission_action_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "permission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(150) NOT NULL,
	"name" varchar(150) NOT NULL,
	"module" varchar(100) NOT NULL,
	"resource" varchar(100) NOT NULL,
	"permission_action_id" uuid NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permission_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"is_system" boolean DEFAULT false NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"staff_code" varchar(50),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"display_name" varchar(200),
	"email" varchar(255) NOT NULL,
	"phone_number" varchar(30),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_user_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
CREATE TABLE "business_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"platform_user_id" uuid NOT NULL,
	"status" varchar(30) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_membership_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"assigned_by" uuid,
	"assignment_reason" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"granted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_security_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_user_id" uuid NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_question" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"question_text" varchar(500) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "security_question_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "user_security_answer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_user_id" uuid NOT NULL,
	"security_question_id" uuid NOT NULL,
	"answer_hash" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "permission" ADD CONSTRAINT "permission_permission_action_id_permission_action_id_fk" FOREIGN KEY ("permission_action_id") REFERENCES "public"."permission_action"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "role" ADD CONSTRAINT "role_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_membership" ADD CONSTRAINT "business_membership_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_membership" ADD CONSTRAINT "business_membership_platform_user_id_platform_user_id_fk" FOREIGN KEY ("platform_user_id") REFERENCES "public"."platform_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_business_membership_id_business_membership_id_fk" FOREIGN KEY ("business_membership_id") REFERENCES "public"."business_membership"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_assigned_by_platform_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."platform_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permission"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_granted_by_platform_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."platform_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_security_profile" ADD CONSTRAINT "user_security_profile_platform_user_id_platform_user_id_fk" FOREIGN KEY ("platform_user_id") REFERENCES "public"."platform_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_security_answer" ADD CONSTRAINT "user_security_answer_platform_user_id_platform_user_id_fk" FOREIGN KEY ("platform_user_id") REFERENCES "public"."platform_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_security_answer" ADD CONSTRAINT "user_security_answer_security_question_id_security_question_id_fk" FOREIGN KEY ("security_question_id") REFERENCES "public"."security_question"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "permission_module_resource_action_uidx" ON "permission" USING btree ("module","resource","permission_action_id");
--> statement-breakpoint
CREATE INDEX "permission_action_id_idx" ON "permission" USING btree ("permission_action_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "role_platform_code_uidx" ON "role" USING btree ("code") WHERE "business_id" is null;
--> statement-breakpoint
CREATE UNIQUE INDEX "role_business_code_uidx" ON "role" USING btree ("business_id","code") WHERE "business_id" is not null;
--> statement-breakpoint
CREATE UNIQUE INDEX "user_role_membership_role_active_uidx" ON "user_role" USING btree ("business_membership_id","role_id") WHERE "effective_to" is null;
--> statement-breakpoint
CREATE INDEX "user_role_business_membership_id_idx" ON "user_role" USING btree ("business_membership_id");
--> statement-breakpoint
CREATE INDEX "user_role_role_id_idx" ON "user_role" USING btree ("role_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "role_permission_role_permission_uidx" ON "role_permission" USING btree ("role_id","permission_id");
--> statement-breakpoint
CREATE INDEX "role_permission_role_id_idx" ON "role_permission" USING btree ("role_id");
--> statement-breakpoint
CREATE INDEX "role_permission_permission_id_idx" ON "role_permission" USING btree ("permission_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_security_profile_platform_user_uidx" ON "user_security_profile" USING btree ("platform_user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_security_answer_platform_user_uidx" ON "user_security_answer" USING btree ("platform_user_id");
