CREATE TABLE "supplier_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_profile_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"supplier_lot_code" text NOT NULL,
	"quantity" numeric(14, 3),
	"quantity_unit" text,
	"location_name" text,
	"country_code" text,
	"owner_name" text,
	"physical_lot_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_lots_physical_lot_id_unique" UNIQUE("physical_lot_id"),
	CONSTRAINT "supplier_lot_positive_quantity" CHECK (quantity IS NULL OR quantity > 0)
);
--> statement-breakpoint
CREATE TABLE "supplier_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_profile_id" uuid NOT NULL,
	"name" text NOT NULL,
	"ingredient" text NOT NULL,
	"form" text,
	"origin" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_sampling_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_lot_id" uuid NOT NULL,
	"supplier_profile_id" uuid NOT NULL,
	"sampling_order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_sampling_requests_supplier_lot_id_unique" UNIQUE("supplier_lot_id")
);
--> statement-breakpoint
ALTER TABLE "public_documents" ADD COLUMN "supplier_reported" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "supplier_profiles" ADD COLUMN "about" text;--> statement-breakpoint
ALTER TABLE "supplier_profiles" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "supplier_lots" ADD CONSTRAINT "supplier_lots_supplier_profile_id_supplier_profiles_id_fk" FOREIGN KEY ("supplier_profile_id") REFERENCES "public"."supplier_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_lots" ADD CONSTRAINT "supplier_lots_product_id_supplier_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."supplier_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_lots" ADD CONSTRAINT "supplier_lots_physical_lot_id_physical_lots_id_fk" FOREIGN KEY ("physical_lot_id") REFERENCES "public"."physical_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplier_profile_id_supplier_profiles_id_fk" FOREIGN KEY ("supplier_profile_id") REFERENCES "public"."supplier_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_sampling_requests" ADD CONSTRAINT "supplier_sampling_requests_supplier_lot_id_supplier_lots_id_fk" FOREIGN KEY ("supplier_lot_id") REFERENCES "public"."supplier_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_sampling_requests" ADD CONSTRAINT "supplier_sampling_requests_supplier_profile_id_supplier_profiles_id_fk" FOREIGN KEY ("supplier_profile_id") REFERENCES "public"."supplier_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_sampling_requests" ADD CONSTRAINT "supplier_sampling_requests_sampling_order_id_sampling_orders_id_fk" FOREIGN KEY ("sampling_order_id") REFERENCES "public"."sampling_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_lot_profile_code_uq" ON "supplier_lots" USING btree ("supplier_profile_id","supplier_lot_code");