CREATE TYPE "public"."requirement_match_status" AS ENUM('ACTIVE', 'INVALIDATED');--> statement-breakpoint
CREATE TYPE "public"."reservation_intent_status" AS ENUM('ACTIVE', 'CANCELLED', 'EXPIRED', 'INVALIDATED');--> statement-breakpoint
CREATE TYPE "public"."supplier_quote_status" AS ENUM('DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'WITHDRAWN');--> statement-breakpoint
CREATE TABLE "requirement_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_requirement_id" uuid NOT NULL,
	"marketplace_listing_id" uuid NOT NULL,
	"profile_version_id" uuid NOT NULL,
	"status" "requirement_match_status" DEFAULT 'ACTIVE' NOT NULL,
	"matched_by_user_id" uuid,
	"matched_at" timestamp with time zone NOT NULL,
	"invalidated_at" timestamp with time zone,
	"invalidation_reason" text
);
--> statement-breakpoint
CREATE TABLE "reservation_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_quote_id" uuid NOT NULL,
	"requirement_match_id" uuid NOT NULL,
	"marketplace_listing_id" uuid NOT NULL,
	"buyer_organization_id" uuid NOT NULL,
	"supplier_organization_id" uuid NOT NULL,
	"status" "reservation_intent_status" DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"invalidated_at" timestamp with time zone,
	"status_reason" text,
	CONSTRAINT "reservation_intents_supplier_quote_id_unique" UNIQUE("supplier_quote_id")
);
--> statement-breakpoint
CREATE TABLE "supplier_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_match_id" uuid NOT NULL,
	"buyer_organization_id" uuid NOT NULL,
	"supplier_organization_id" uuid NOT NULL,
	"status" "supplier_quote_status" DEFAULT 'DRAFT' NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"quantity_unit" text NOT NULL,
	"unit_price" numeric(14, 4) NOT NULL,
	"currency" text NOT NULL,
	"terms" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "requirement_matches" ADD CONSTRAINT "requirement_matches_buyer_requirement_id_buyer_requirements_id_fk" FOREIGN KEY ("buyer_requirement_id") REFERENCES "public"."buyer_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_matches" ADD CONSTRAINT "requirement_matches_marketplace_listing_id_marketplace_listings_id_fk" FOREIGN KEY ("marketplace_listing_id") REFERENCES "public"."marketplace_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_matches" ADD CONSTRAINT "requirement_matches_profile_version_id_compliance_profile_versions_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."compliance_profile_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_matches" ADD CONSTRAINT "requirement_matches_matched_by_user_id_users_id_fk" FOREIGN KEY ("matched_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_intents" ADD CONSTRAINT "reservation_intents_supplier_quote_id_supplier_quotes_id_fk" FOREIGN KEY ("supplier_quote_id") REFERENCES "public"."supplier_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_intents" ADD CONSTRAINT "reservation_intents_requirement_match_id_requirement_matches_id_fk" FOREIGN KEY ("requirement_match_id") REFERENCES "public"."requirement_matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_intents" ADD CONSTRAINT "reservation_intents_marketplace_listing_id_marketplace_listings_id_fk" FOREIGN KEY ("marketplace_listing_id") REFERENCES "public"."marketplace_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_intents" ADD CONSTRAINT "reservation_intents_buyer_organization_id_organizations_id_fk" FOREIGN KEY ("buyer_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_intents" ADD CONSTRAINT "reservation_intents_supplier_organization_id_organizations_id_fk" FOREIGN KEY ("supplier_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_intents" ADD CONSTRAINT "reservation_intents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_requirement_match_id_requirement_matches_id_fk" FOREIGN KEY ("requirement_match_id") REFERENCES "public"."requirement_matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_buyer_organization_id_organizations_id_fk" FOREIGN KEY ("buyer_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_supplier_organization_id_organizations_id_fk" FOREIGN KEY ("supplier_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "requirement_listing_match_uq" ON "requirement_matches" USING btree ("buyer_requirement_id","marketplace_listing_id");--> statement-breakpoint
CREATE INDEX "requirement_match_status_idx" ON "requirement_matches" USING btree ("buyer_requirement_id","status");--> statement-breakpoint
CREATE INDEX "reservation_listing_status_idx" ON "reservation_intents" USING btree ("marketplace_listing_id","status");--> statement-breakpoint
CREATE INDEX "supplier_quote_tenant_status_idx" ON "supplier_quotes" USING btree ("supplier_organization_id","buyer_organization_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "one_open_quote_per_match_uq" ON "supplier_quotes" ("requirement_match_id") WHERE "status" IN ('DRAFT', 'SENT');
--> statement-breakpoint
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quote_positive_values" CHECK ("quantity" > 0 AND "unit_price" > 0);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION vle_listing_is_eligible(target_listing_id uuid, target_profile_version_id uuid, at_time timestamptz DEFAULT now()) RETURNS boolean AS $$
DECLARE eligible boolean;
BEGIN
  SELECT (
    ml.status = 'LISTED' AND q.outcome = 'QUALIFIED' AND q.profile_version_id = target_profile_version_id
    AND pv.status = 'FROZEN' AND e.status = 'CURRENT' AND e.expires_at > at_time
    AND l.identity_confirmed_at IS NOT NULL AND l.quantity_verified_at IS NOT NULL
    AND l.location_verified_at IS NOT NULL AND l.authority_to_sell_verified_at IS NOT NULL
    AND l.held_at IS NULL AND l.revoked_at IS NULL AND l.transformed_at IS NULL AND l.depleted_at IS NULL
    AND cp.product_type_id = l.product_type_id
  ) INTO eligible
  FROM marketplace_listings ml
  JOIN qualification_decisions q ON q.id = ml.qualification_decision_id AND q.physical_lot_id = ml.physical_lot_id
  JOIN physical_lots l ON l.id = ml.physical_lot_id
  JOIN samples s ON s.id = q.sample_id AND s.physical_lot_id = l.id
  JOIN tecrid_evidence e ON e.id = q.evidence_id AND e.sample_id = s.id
  JOIN compliance_profile_versions pv ON pv.id = q.profile_version_id
  JOIN compliance_profiles cp ON cp.id = pv.profile_id
  WHERE ml.id = target_listing_id;
  RETURN COALESCE(eligible, false);
END;
$$ LANGUAGE plpgsql STABLE;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION vle_enforce_requirement_match() RETURNS trigger AS $$
DECLARE eligible boolean;
BEGIN
  IF NEW.status <> 'ACTIVE' THEN RAISE EXCEPTION 'Requirement matches must begin ACTIVE'; END IF;
  SELECT (
    pt.code = 'COCOA_POWDER'
    AND br.product_type_id = l.product_type_id
    AND br.quantity_unit = l.quantity_unit
    AND br.profile_version_id = NEW.profile_version_id
    AND q.profile_version_id = NEW.profile_version_id
    AND l.quantity >= br.quantity
    AND vle_listing_is_eligible(NEW.marketplace_listing_id, NEW.profile_version_id, NEW.matched_at)
  ) INTO eligible
  FROM buyer_requirements br
  JOIN product_types pt ON pt.id = br.product_type_id
  JOIN marketplace_listings ml ON ml.id = NEW.marketplace_listing_id
  JOIN physical_lots l ON l.id = ml.physical_lot_id
  JOIN qualification_decisions q ON q.id = ml.qualification_decision_id
  WHERE br.id = NEW.buyer_requirement_id;
  IF eligible IS DISTINCT FROM true THEN RAISE EXCEPTION 'Requirement match must bind a cocoa requirement to a currently eligible listing and frozen profile'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER requirement_match_gate BEFORE INSERT ON "requirement_matches" FOR EACH ROW EXECUTE FUNCTION vle_enforce_requirement_match();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION vle_enforce_match_transition() RETURNS trigger AS $$
BEGIN
  IF OLD.status <> 'ACTIVE' OR NEW.status <> 'INVALIDATED' THEN
    RAISE EXCEPTION 'Requirement match can only transition from ACTIVE to INVALIDATED';
  END IF;
  IF NEW.invalidated_at IS NULL OR NEW.invalidation_reason IS NULL THEN
    RAISE EXCEPTION 'Invalidated requirement match requires time and reason';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER requirement_match_state_machine BEFORE UPDATE OF status ON "requirement_matches" FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION vle_enforce_match_transition();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION vle_enforce_quote_insert() RETURNS trigger AS $$
BEGIN
  IF NEW.status <> 'DRAFT' OR NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'Supplier quote must begin DRAFT with a future expiry';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM requirement_matches rm
    JOIN buyer_requirements br ON br.id = rm.buyer_requirement_id
    JOIN marketplace_listings ml ON ml.id = rm.marketplace_listing_id
    JOIN physical_lots l ON l.id = ml.physical_lot_id
    WHERE rm.id = NEW.requirement_match_id AND rm.status = 'ACTIVE'
      AND br.buyer_organization_id = NEW.buyer_organization_id
      AND l.supplier_organization_id = NEW.supplier_organization_id
      AND NEW.quantity_unit = br.quantity_unit AND NEW.quantity_unit = l.quantity_unit
      AND NEW.quantity >= br.quantity AND NEW.quantity <= l.quantity
      AND vle_listing_is_eligible(ml.id, rm.profile_version_id, now())
  ) THEN RAISE EXCEPTION 'Supplier quote tenant or eligible-listing binding is invalid'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER supplier_quote_insert_gate BEFORE INSERT ON "supplier_quotes" FOR EACH ROW EXECUTE FUNCTION vle_enforce_quote_insert();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION vle_enforce_quote_transition() RETURNS trigger AS $$
BEGIN
  IF NOT (
    (OLD.status = 'DRAFT' AND NEW.status IN ('SENT', 'EXPIRED', 'WITHDRAWN'))
    OR (OLD.status = 'SENT' AND NEW.status IN ('ACCEPTED', 'EXPIRED', 'WITHDRAWN'))
  ) THEN RAISE EXCEPTION 'Supplier quote transition is prohibited'; END IF;
  IF NEW.status = 'EXPIRED' AND NEW.expires_at > now() THEN RAISE EXCEPTION 'Supplier quote cannot expire early'; END IF;
  IF NEW.status IN ('SENT', 'ACCEPTED') AND NEW.expires_at <= now() THEN RAISE EXCEPTION 'Expired supplier quote cannot advance'; END IF;
  IF NEW.status = 'ACCEPTED' AND NOT EXISTS (
    SELECT 1 FROM requirement_matches rm
    WHERE rm.id = NEW.requirement_match_id AND rm.status = 'ACTIVE'
      AND vle_listing_is_eligible(rm.marketplace_listing_id, rm.profile_version_id, now())
  ) THEN RAISE EXCEPTION 'Supplier quote cannot be accepted after its match loses eligibility'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER supplier_quote_state_machine BEFORE UPDATE OF status ON "supplier_quotes" FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION vle_enforce_quote_transition();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION vle_enforce_reservation_insert() RETURNS trigger AS $$
BEGIN
  IF NEW.status <> 'ACTIVE' OR NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'Reservation intent must begin ACTIVE with a future expiry';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM supplier_quotes sq
    JOIN requirement_matches rm ON rm.id = sq.requirement_match_id
    WHERE sq.id = NEW.supplier_quote_id AND sq.status = 'ACCEPTED'
      AND rm.id = NEW.requirement_match_id AND rm.status = 'ACTIVE'
      AND rm.marketplace_listing_id = NEW.marketplace_listing_id
      AND sq.buyer_organization_id = NEW.buyer_organization_id
      AND sq.supplier_organization_id = NEW.supplier_organization_id
      AND vle_listing_is_eligible(NEW.marketplace_listing_id, rm.profile_version_id, now())
  ) THEN RAISE EXCEPTION 'Reservation intent must bind an accepted quote to a currently eligible listing'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER reservation_intent_insert_gate BEFORE INSERT ON "reservation_intents" FOR EACH ROW EXECUTE FUNCTION vle_enforce_reservation_insert();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION vle_enforce_reservation_transition() RETURNS trigger AS $$
BEGIN
  IF OLD.status <> 'ACTIVE' OR NEW.status NOT IN ('CANCELLED', 'EXPIRED', 'INVALIDATED') THEN
    RAISE EXCEPTION 'Reservation intent transition is prohibited';
  END IF;
  IF NEW.status = 'EXPIRED' AND NEW.expires_at > now() THEN RAISE EXCEPTION 'Reservation intent cannot expire early'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER reservation_intent_state_machine BEFORE UPDATE OF status ON "reservation_intents" FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION vle_enforce_reservation_transition();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION vle_invalidate_commercial_intent() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'LISTED' AND NEW.status = 'UNLISTED' THEN
    UPDATE requirement_matches SET status = 'INVALIDATED', invalidated_at = COALESCE(NEW.unpublished_at, now()), invalidation_reason = COALESCE(NEW.unpublish_reason, 'Listing unlisted')
    WHERE marketplace_listing_id = NEW.id AND status = 'ACTIVE';
    UPDATE reservation_intents SET status = 'INVALIDATED', invalidated_at = COALESCE(NEW.unpublished_at, now()), status_reason = COALESCE(NEW.unpublish_reason, 'Listing unlisted')
    WHERE marketplace_listing_id = NEW.id AND status = 'ACTIVE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER listing_unlist_invalidates_commercial_intent AFTER UPDATE OF status ON "marketplace_listings" FOR EACH ROW EXECUTE FUNCTION vle_invalidate_commercial_intent();
