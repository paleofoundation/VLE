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
CREATE OR REPLACE FUNCTION vle_enforce_sample_binding() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sampling_orders so WHERE so.id = NEW.sampling_order_id AND so.physical_lot_id = NEW.physical_lot_id) THEN
    RAISE EXCEPTION 'Sample must bind its sampling order to the same physical lot';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS sample_lot_binding ON samples;
--> statement-breakpoint
CREATE TRIGGER sample_lot_binding BEFORE INSERT OR UPDATE ON samples FOR EACH ROW EXECUTE FUNCTION vle_enforce_sample_binding();
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
DROP TRIGGER IF EXISTS qualification_input_binding ON qualification_decisions;
--> statement-breakpoint
CREATE TRIGGER qualification_input_binding BEFORE INSERT ON qualification_decisions FOR EACH ROW EXECUTE FUNCTION vle_enforce_decision_inputs();
