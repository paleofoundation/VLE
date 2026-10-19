CREATE TABLE "certification_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_profile_id" uuid NOT NULL,
	"certification_key" text NOT NULL,
	"note" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_profile_id" uuid NOT NULL,
	"certification_key" text NOT NULL,
	"other_name" text,
	"certifying_body" text,
	"certificate_number" text,
	"expires_on" date,
	"source_url" text,
	"confirmed_at" date,
	"confirmed_issuer" text,
	"confirmed_by_user_id" uuid,
	"flagged_at" timestamp with time zone,
	"flag_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "certification_suggestions" ADD CONSTRAINT "certification_suggestions_supplier_profile_id_supplier_profiles_id_fk" FOREIGN KEY ("supplier_profile_id") REFERENCES "public"."supplier_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certification_suggestions" ADD CONSTRAINT "certification_suggestions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_certifications" ADD CONSTRAINT "supplier_certifications_supplier_profile_id_supplier_profiles_id_fk" FOREIGN KEY ("supplier_profile_id") REFERENCES "public"."supplier_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_certifications" ADD CONSTRAINT "supplier_certifications_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_certification_key_uq" ON "supplier_certifications" USING btree ("supplier_profile_id","certification_key");