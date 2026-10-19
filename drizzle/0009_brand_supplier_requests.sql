CREATE TYPE "public"."supplier_request_status" AS ENUM('OPEN', 'RESPONDED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."supplier_request_type" AS ENUM('DOCUMENT', 'SAMPLE', 'QUOTE', 'INVITE_SUPPLIER');--> statement-breakpoint
CREATE TABLE "request_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"author_org_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "supplier_request_type" NOT NULL,
	"buyer_org_id" uuid NOT NULL,
	"supplier_profile_id" uuid NOT NULL,
	"lot_id" uuid,
	"message" text NOT NULL,
	"quantity_text" text,
	"status" "supplier_request_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "request_replies" ADD CONSTRAINT "request_replies_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_replies" ADD CONSTRAINT "request_replies_author_org_id_organizations_id_fk" FOREIGN KEY ("author_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_replies" ADD CONSTRAINT "request_replies_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_buyer_org_id_organizations_id_fk" FOREIGN KEY ("buyer_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_supplier_profile_id_supplier_profiles_id_fk" FOREIGN KEY ("supplier_profile_id") REFERENCES "public"."supplier_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_lot_id_physical_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."physical_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "request_buyer_idx" ON "requests" USING btree ("buyer_org_id");--> statement-breakpoint
CREATE INDEX "request_supplier_idx" ON "requests" USING btree ("supplier_profile_id");