ALTER TABLE "supplier_certifications" ADD COLUMN "supplier_reported" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
UPDATE "supplier_certifications" SET "supplier_reported" = false WHERE "supplier_profile_id" IN (SELECT "id" FROM "supplier_profiles" WHERE "slug" = 'kasandrinos' AND "listing_source" = 'PUBLIC_DOCUMENTS' AND "organization_id" IS NULL);
