CREATE TYPE "public"."claim_status" AS ENUM('UNCLAIMED', 'CLAIM_PENDING', 'CLAIMED');--> statement-breakpoint
CREATE TYPE "public"."listing_source" AS ENUM('PUBLIC_DOCUMENTS', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."public_document_type" AS ENUM('Heavy metals report', 'Pesticide residue report', 'Phthalates report', 'Glyphosate report', 'Arsenic report', 'COA', 'Certificate', 'Other');--> statement-breakpoint
CREATE TYPE "public"."public_link_state" AS ENUM('LIVE', 'NO_LONGER_PUBLISHED');--> statement-breakpoint
CREATE TABLE "public_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_profile_id" uuid NOT NULL,
	"product_name" text,
	"lot_or_batch" text,
	"doc_type" "public_document_type" NOT NULL,
	"tests_text" text,
	"analytes" text[] DEFAULT '{}'::text[] NOT NULL,
	"lab_name" text,
	"lab_accreditation_as_stated" text,
	"report_date" date,
	"report_date_text" text,
	"source_url" text NOT NULL,
	"source_domain" text NOT NULL,
	"source_page_url" text,
	"found_at" date NOT NULL,
	"last_checked_at" timestamp with time zone,
	"http_status" numeric(3, 0),
	"sha256" text,
	"link_state" "public_link_state" DEFAULT 'LIVE' NOT NULL,
	"verification_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"country" text,
	"website" text,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"certifications_shown" text,
	"listing_source" "listing_source" DEFAULT 'PUBLIC_DOCUMENTS' NOT NULL,
	"claim_status" "claim_status" DEFAULT 'UNCLAIMED' NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_profiles_organization_id_unique" UNIQUE("organization_id"),
	CONSTRAINT "supplier_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "public_documents" ADD CONSTRAINT "public_documents_supplier_profile_id_supplier_profiles_id_fk" FOREIGN KEY ("supplier_profile_id") REFERENCES "public"."supplier_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_profiles" ADD CONSTRAINT "supplier_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "public_document_supplier_source_uq" ON "public_documents" USING btree ("supplier_profile_id","source_url");--> statement-breakpoint
CREATE INDEX "public_document_supplier_idx" ON "public_documents" USING btree ("supplier_profile_id");