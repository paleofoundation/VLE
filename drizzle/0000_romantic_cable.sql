CREATE TYPE "public"."evidence_status" AS ENUM('CURRENT', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('LISTED', 'UNLISTED');--> statement-breakpoint
CREATE TYPE "public"."lot_status" AS ENUM('NOMINATED', 'SAMPLING', 'EVIDENCE_RECEIVED', 'QUALIFIED', 'NOT_QUALIFIED', 'INSUFFICIENT_EVIDENCE', 'HELD', 'REVOKED', 'TRANSFORMED', 'DEPLETED');--> statement-breakpoint
CREATE TYPE "public"."organization_kind" AS ENUM('BUYER', 'SUPPLIER', 'PLATFORM');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('DRAFT', 'FROZEN', 'RETIRED');--> statement-breakpoint
CREATE TYPE "public"."qualification_outcome" AS ENUM('QUALIFIED', 'NOT_QUALIFIED', 'INSUFFICIENT_EVIDENCE');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('BUYER', 'SUPPLIER', 'OPS', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."sampling_status" AS ENUM('REQUESTED', 'SCHEDULED', 'COLLECTED', 'SHIPPED', 'RECEIVED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"actor_organization_id" uuid,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"previous_hash" text,
	"event_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_event_hash_unique" UNIQUE("event_hash")
);
--> statement-breakpoint
CREATE TABLE "buyer_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_organization_id" uuid NOT NULL,
	"product_type_id" uuid NOT NULL,
	"profile_version_id" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"quantity_unit" text NOT NULL,
	"destination" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_profile_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"version" text NOT NULL,
	"status" "profile_status" DEFAULT 'DRAFT' NOT NULL,
	"rules" jsonb NOT NULL,
	"notes" text NOT NULL,
	"frozen_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_type_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"physical_lot_id" uuid NOT NULL,
	"qualification_decision_id" uuid NOT NULL,
	"status" "listing_status" NOT NULL,
	"public_slug" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"unpublished_at" timestamp with time zone,
	"unpublish_reason" text,
	CONSTRAINT "marketplace_listings_public_slug_unique" UNIQUE("public_slug")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"kind" "organization_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "physical_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_organization_id" uuid NOT NULL,
	"product_type_id" uuid NOT NULL,
	"supplier_lot_code" text NOT NULL,
	"status" "lot_status" DEFAULT 'NOMINATED' NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"quantity_unit" text NOT NULL,
	"location_name" text NOT NULL,
	"country_code" text NOT NULL,
	"owner_name" text NOT NULL,
	"identity_confirmed_at" timestamp with time zone,
	"quantity_verified_at" timestamp with time zone,
	"location_verified_at" timestamp with time zone,
	"authority_to_sell_verified_at" timestamp with time zone,
	"held_at" timestamp with time zone,
	"hold_reason" text,
	"revoked_at" timestamp with time zone,
	"transformed_at" timestamp with time zone,
	"depleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "product_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "qualification_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"physical_lot_id" uuid NOT NULL,
	"sample_id" uuid NOT NULL,
	"evidence_id" uuid NOT NULL,
	"profile_version_id" uuid NOT NULL,
	"outcome" "qualification_outcome" NOT NULL,
	"rationale" jsonb NOT NULL,
	"engine_version" text NOT NULL,
	"input_hash" text NOT NULL,
	"decided_at" timestamp with time zone NOT NULL,
	"decided_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sampling_order_id" uuid NOT NULL,
	"physical_lot_id" uuid NOT NULL,
	"sample_code" text NOT NULL,
	"sampled_at" timestamp with time zone NOT NULL,
	"sampler_name" text NOT NULL,
	"method" text NOT NULL,
	"seal_identifiers" jsonb NOT NULL,
	"chain_of_custody" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "samples_sampling_order_id_unique" UNIQUE("sampling_order_id"),
	CONSTRAINT "samples_sample_code_unique" UNIQUE("sample_code")
);
--> statement-breakpoint
CREATE TABLE "sampling_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"physical_lot_id" uuid NOT NULL,
	"requested_by_organization_id" uuid NOT NULL,
	"status" "sampling_status" DEFAULT 'REQUESTED' NOT NULL,
	"assigned_sampler" text,
	"scheduled_for" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tecrid_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sample_id" uuid NOT NULL,
	"tecrid_id" text NOT NULL,
	"issuer" text NOT NULL,
	"status" "evidence_status" DEFAULT 'CURRENT' NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"results" jsonb NOT NULL,
	"payload_hash" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revocation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tecrid_evidence_tecrid_id_unique" UNIQUE("tecrid_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_organization_id_organizations_id_fk" FOREIGN KEY ("actor_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_requirements" ADD CONSTRAINT "buyer_requirements_buyer_organization_id_organizations_id_fk" FOREIGN KEY ("buyer_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_requirements" ADD CONSTRAINT "buyer_requirements_product_type_id_product_types_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."product_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_requirements" ADD CONSTRAINT "buyer_requirements_profile_version_id_compliance_profile_versions_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."compliance_profile_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_profile_versions" ADD CONSTRAINT "compliance_profile_versions_profile_id_compliance_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."compliance_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_profile_versions" ADD CONSTRAINT "compliance_profile_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_profiles" ADD CONSTRAINT "compliance_profiles_product_type_id_product_types_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."product_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_physical_lot_id_physical_lots_id_fk" FOREIGN KEY ("physical_lot_id") REFERENCES "public"."physical_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_qualification_decision_id_qualification_decisions_id_fk" FOREIGN KEY ("qualification_decision_id") REFERENCES "public"."qualification_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_lots" ADD CONSTRAINT "physical_lots_supplier_organization_id_organizations_id_fk" FOREIGN KEY ("supplier_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_lots" ADD CONSTRAINT "physical_lots_product_type_id_product_types_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."product_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_decisions" ADD CONSTRAINT "qualification_decisions_physical_lot_id_physical_lots_id_fk" FOREIGN KEY ("physical_lot_id") REFERENCES "public"."physical_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_decisions" ADD CONSTRAINT "qualification_decisions_sample_id_samples_id_fk" FOREIGN KEY ("sample_id") REFERENCES "public"."samples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_decisions" ADD CONSTRAINT "qualification_decisions_evidence_id_tecrid_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."tecrid_evidence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_decisions" ADD CONSTRAINT "qualification_decisions_profile_version_id_compliance_profile_versions_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."compliance_profile_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_decisions" ADD CONSTRAINT "qualification_decisions_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_sampling_order_id_sampling_orders_id_fk" FOREIGN KEY ("sampling_order_id") REFERENCES "public"."sampling_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_physical_lot_id_physical_lots_id_fk" FOREIGN KEY ("physical_lot_id") REFERENCES "public"."physical_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sampling_orders" ADD CONSTRAINT "sampling_orders_physical_lot_id_physical_lots_id_fk" FOREIGN KEY ("physical_lot_id") REFERENCES "public"."physical_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sampling_orders" ADD CONSTRAINT "sampling_orders_requested_by_organization_id_organizations_id_fk" FOREIGN KEY ("requested_by_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tecrid_evidence" ADD CONSTRAINT "tecrid_evidence_sample_id_samples_id_fk" FOREIGN KEY ("sample_id") REFERENCES "public"."samples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_version_uq" ON "compliance_profile_versions" USING btree ("profile_id","version");--> statement-breakpoint
CREATE INDEX "listing_lot_status_idx" ON "marketplace_listings" USING btree ("physical_lot_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_user_org_role_uq" ON "memberships" USING btree ("user_id","organization_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "physical_lot_supplier_code_uq" ON "physical_lots" USING btree ("supplier_organization_id","supplier_lot_code");--> statement-breakpoint
CREATE INDEX "qualification_lot_decided_idx" ON "qualification_decisions" USING btree ("physical_lot_id","decided_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_listing_per_lot_uq" ON "marketplace_listings" ("physical_lot_id") WHERE "status" = 'LISTED';
--> statement-breakpoint
CREATE OR REPLACE FUNCTION vle_prevent_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% records are append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER qualification_decisions_append_only BEFORE UPDATE OR DELETE ON "qualification_decisions" FOR EACH ROW EXECUTE FUNCTION vle_prevent_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON "audit_events" FOR EACH ROW EXECUTE FUNCTION vle_prevent_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION vle_protect_profile_version() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD.status = 'FROZEN' THEN
    RAISE EXCEPTION 'Compliance profile versions cannot be deleted or changed after freezing';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER compliance_profile_versions_immutable BEFORE UPDATE OR DELETE ON "compliance_profile_versions" FOR EACH ROW EXECUTE FUNCTION vle_protect_profile_version();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION vle_enforce_listing_gate() RETURNS trigger AS $$
DECLARE eligible boolean;
BEGIN
  IF NEW.status <> 'LISTED' THEN RETURN NEW; END IF;
  SELECT (
    q.outcome = 'QUALIFIED' AND pv.status = 'FROZEN' AND e.status = 'CURRENT' AND e.expires_at > now()
    AND l.identity_confirmed_at IS NOT NULL AND l.quantity_verified_at IS NOT NULL
    AND l.location_verified_at IS NOT NULL AND l.authority_to_sell_verified_at IS NOT NULL
    AND l.held_at IS NULL AND l.revoked_at IS NULL AND l.transformed_at IS NULL AND l.depleted_at IS NULL
    AND cp.product_type_id = l.product_type_id
  ) INTO eligible
  FROM qualification_decisions q
  JOIN physical_lots l ON l.id = q.physical_lot_id
  JOIN samples s ON s.id = q.sample_id AND s.physical_lot_id = l.id
  JOIN tecrid_evidence e ON e.id = q.evidence_id AND e.sample_id = s.id
  JOIN compliance_profile_versions pv ON pv.id = q.profile_version_id
  JOIN compliance_profiles cp ON cp.id = pv.profile_id
  WHERE q.id = NEW.qualification_decision_id AND l.id = NEW.physical_lot_id;
  IF eligible IS DISTINCT FROM true THEN RAISE EXCEPTION 'VLE publication gate rejected listing'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER marketplace_listing_gate BEFORE INSERT OR UPDATE OF status ON "marketplace_listings" FOR EACH ROW EXECUTE FUNCTION vle_enforce_listing_gate();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION vle_auto_unlist() RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'tecrid_evidence' AND NEW.status = 'REVOKED' THEN
    UPDATE marketplace_listings ml SET status = 'UNLISTED', unpublished_at = now(), unpublish_reason = 'Automatic: TECRID evidence revoked'
    FROM qualification_decisions q WHERE ml.qualification_decision_id = q.id AND q.evidence_id = NEW.id AND ml.status = 'LISTED';
  ELSIF TG_TABLE_NAME = 'physical_lots' AND (NEW.held_at IS NOT NULL OR NEW.revoked_at IS NOT NULL OR NEW.transformed_at IS NOT NULL OR NEW.depleted_at IS NOT NULL) THEN
    UPDATE marketplace_listings SET status = 'UNLISTED', unpublished_at = now(), unpublish_reason = 'Automatic: physical lot ineligible'
    WHERE physical_lot_id = NEW.id AND status = 'LISTED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER tecrid_revoke_unlists AFTER UPDATE OF status ON "tecrid_evidence" FOR EACH ROW EXECUTE FUNCTION vle_auto_unlist();
--> statement-breakpoint
CREATE TRIGGER physical_lot_invalidation_unlists AFTER UPDATE OF held_at, revoked_at, transformed_at, depleted_at ON "physical_lots" FOR EACH ROW EXECUTE FUNCTION vle_auto_unlist();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION vle_enforce_sample_binding() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sampling_orders so WHERE so.id = NEW.sampling_order_id AND so.physical_lot_id = NEW.physical_lot_id) THEN
    RAISE EXCEPTION 'Sample must bind its sampling order to the same physical lot';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER sample_lot_binding BEFORE INSERT OR UPDATE ON "samples" FOR EACH ROW EXECUTE FUNCTION vle_enforce_sample_binding();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION vle_enforce_decision_inputs() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM samples s
    JOIN tecrid_evidence e ON e.id = NEW.evidence_id AND e.sample_id = s.id
    JOIN physical_lots l ON l.id = NEW.physical_lot_id AND l.id = s.physical_lot_id
    JOIN compliance_profile_versions pv ON pv.id = NEW.profile_version_id AND pv.status = 'FROZEN'
    JOIN compliance_profiles cp ON cp.id = pv.profile_id AND cp.product_type_id = l.product_type_id
    WHERE s.id = NEW.sample_id
  ) THEN RAISE EXCEPTION 'Qualification inputs must bind one lot, sample, evidence, and frozen applicable profile'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER qualification_input_binding BEFORE INSERT ON "qualification_decisions" FOR EACH ROW EXECUTE FUNCTION vle_enforce_decision_inputs();
