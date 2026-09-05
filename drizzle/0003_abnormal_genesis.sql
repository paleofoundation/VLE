CREATE TYPE "public"."lot_artifact_type" AS ENUM('SUPPLIER_COA', 'SUPPLIER_PDF');--> statement-breakpoint
CREATE TABLE "lot_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"physical_lot_id" uuid NOT NULL,
	"artifact_type" "lot_artifact_type" NOT NULL,
	"file_name" text NOT NULL,
	"reference_url" text NOT NULL,
	"document_date" timestamp with time zone,
	"notes" text,
	"logged_by_user_id" uuid,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lot_artifacts" ADD CONSTRAINT "lot_artifacts_physical_lot_id_physical_lots_id_fk" FOREIGN KEY ("physical_lot_id") REFERENCES "public"."physical_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_artifacts" ADD CONSTRAINT "lot_artifacts_logged_by_user_id_users_id_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lot_artifact_lot_received_idx" ON "lot_artifacts" USING btree ("physical_lot_id","received_at");