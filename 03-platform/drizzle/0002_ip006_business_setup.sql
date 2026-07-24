CREATE TABLE "business_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"trading_name" varchar(200) NOT NULL,
	"logo_url" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"physical_address" varchar(500) NOT NULL,
	"county" varchar(150) NOT NULL,
	"city" varchar(150) NOT NULL,
	"website" varchar(500),
	"description" varchar(2000),
	"gps_latitude" numeric(10, 7),
	"gps_longitude" numeric(10, 7),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_profile_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "business_operating_currency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"is_base" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "business_operating_currency_business_currency_uidx" ON "business_operating_currency" USING btree ("business_id","currency_code");
--> statement-breakpoint
CREATE TABLE "business_configuration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"settings" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_configuration_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "business_setup_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"current_step" varchar(50) NOT NULL,
	"last_completed_step" varchar(50),
	"completed_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_by" uuid,
	"completed_at" timestamp with time zone,
	"wizard_version" varchar(20) NOT NULL,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_setup_progress_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
ALTER TABLE "business_profile" ADD CONSTRAINT "business_profile_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_operating_currency" ADD CONSTRAINT "business_operating_currency_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_configuration" ADD CONSTRAINT "business_configuration_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_setup_progress" ADD CONSTRAINT "business_setup_progress_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_setup_progress" ADD CONSTRAINT "business_setup_progress_completed_by_platform_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."platform_user"("id") ON DELETE no action ON UPDATE no action;
