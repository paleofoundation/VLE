CREATE TYPE "public"."contaminant_documentation_type" AS ENUM('HEAVY_METALS', 'PFAS', 'MICROPLASTICS');--> statement-breakpoint
CREATE TABLE "contaminant_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documentation_type" "contaminant_documentation_type" NOT NULL,
	"supplier_organization_id" uuid NOT NULL,
	"physical_lot_id" uuid,
	"compliance_profile_id" uuid,
	"file_name" text NOT NULL,
	"reference_url" text NOT NULL,
	"document_date" timestamp with time zone,
	"retest_on" timestamp with time zone,
	"notes" text,
	"attached_by_user_id" uuid,
	"attached_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contaminant_document_one_subject_chk" CHECK ((physical_lot_id IS NOT NULL AND compliance_profile_id IS NULL) OR (physical_lot_id IS NULL AND compliance_profile_id IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "contaminant_documents" ADD CONSTRAINT "contaminant_documents_supplier_organization_id_organizations_id_fk" FOREIGN KEY ("supplier_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contaminant_documents" ADD CONSTRAINT "contaminant_documents_physical_lot_id_physical_lots_id_fk" FOREIGN KEY ("physical_lot_id") REFERENCES "public"."physical_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contaminant_documents" ADD CONSTRAINT "contaminant_documents_compliance_profile_id_compliance_profiles_id_fk" FOREIGN KEY ("compliance_profile_id") REFERENCES "public"."compliance_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contaminant_documents" ADD CONSTRAINT "contaminant_documents_attached_by_user_id_users_id_fk" FOREIGN KEY ("attached_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contaminant_document_supplier_idx" ON "contaminant_documents" USING btree ("supplier_organization_id","attached_at");--> statement-breakpoint
CREATE INDEX "contaminant_document_lot_idx" ON "contaminant_documents" USING btree ("physical_lot_id");--> statement-breakpoint
CREATE INDEX "contaminant_document_profile_idx" ON "contaminant_documents" USING btree ("compliance_profile_id");--> statement-breakpoint
COMMENT ON TABLE "contaminant_documents" IS 'Supplier file reference for one documentation type, attached to one lot or one profile. Not a measured result, sample, TECRID record, or qualification.';--> statement-breakpoint
CREATE OR REPLACE FUNCTION vle_enforce_contaminant_document_lot() RETURNS trigger AS $$
BEGIN
  IF NEW.physical_lot_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM physical_lots l
    WHERE l.id = NEW.physical_lot_id AND l.supplier_organization_id = NEW.supplier_organization_id
  ) THEN
    RAISE EXCEPTION 'Contaminant document lot must belong to the supplier organization';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS contaminant_document_lot_owner ON contaminant_documents;--> statement-breakpoint
CREATE TRIGGER contaminant_document_lot_owner BEFORE INSERT OR UPDATE ON contaminant_documents FOR EACH ROW EXECUTE FUNCTION vle_enforce_contaminant_document_lot();