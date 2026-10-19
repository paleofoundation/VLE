CREATE TYPE "public"."claim_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "profile_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_profile_id" uuid NOT NULL,
	"claimant_org_id" uuid NOT NULL,
	"claimant_user_id" uuid NOT NULL,
	"primary_email" text NOT NULL,
	"domain_matched" boolean NOT NULL,
	"proof_note" text,
	"status" "claim_request_status" DEFAULT 'PENDING' NOT NULL,
	"review_note" text,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_form_quotas" (
	"key" text PRIMARY KEY NOT NULL,
	"attempts" numeric(5, 0) NOT NULL,
	"resets_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "takedown_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"profile_url" text NOT NULL,
	"what_to_remove" text NOT NULL,
	"reason" text NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supplier_profiles" ADD COLUMN "moderation_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_claims" ADD CONSTRAINT "profile_claims_supplier_profile_id_supplier_profiles_id_fk" FOREIGN KEY ("supplier_profile_id") REFERENCES "public"."supplier_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_claims" ADD CONSTRAINT "profile_claims_claimant_org_id_organizations_id_fk" FOREIGN KEY ("claimant_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_claims" ADD CONSTRAINT "profile_claims_claimant_user_id_users_id_fk" FOREIGN KEY ("claimant_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_claims" ADD CONSTRAINT "profile_claims_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "takedown_requests" ADD CONSTRAINT "takedown_requests_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "claim_profile_user_uq" ON "profile_claims" USING btree ("supplier_profile_id","claimant_user_id");