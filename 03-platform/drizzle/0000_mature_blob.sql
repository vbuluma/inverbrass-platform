CREATE TABLE "business_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"icon" varchar(100),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "business" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(200) NOT NULL,
	"business_type_id" uuid NOT NULL,
	"status_code" varchar(20) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"timezone" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "business" ADD CONSTRAINT "business_business_type_id_business_type_id_fk" FOREIGN KEY ("business_type_id") REFERENCES "public"."business_type"("id") ON DELETE no action ON UPDATE no action;