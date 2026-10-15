ALTER TABLE "contaminant_documents" ALTER COLUMN "reference_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contaminant_documents" ADD COLUMN "file_content" "bytea";--> statement-breakpoint
ALTER TABLE "contaminant_documents" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "contaminant_documents" ADD COLUMN "content_type" text;--> statement-breakpoint
ALTER TABLE "contaminant_documents" ADD CONSTRAINT "contaminant_document_source_chk" CHECK ((reference_url IS NOT NULL AND file_content IS NULL AND file_size IS NULL AND content_type IS NULL)
      OR (reference_url IS NULL AND file_content IS NOT NULL AND file_size IS NOT NULL
        AND content_type IS NOT NULL AND content_type = 'application/pdf'
        AND file_size BETWEEN 1 AND 524288 AND octet_length(file_content) = file_size));