CREATE TABLE brand_saved_requirements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),name text NOT NULL,category text NOT NULL,limits jsonb NOT NULL,alerts_enabled boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE saved_suppliers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),supplier_slug text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX saved_supplier_org_slug_uq ON saved_suppliers(organization_id,supplier_slug);
CREATE TABLE requirement_alerts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),requirement_id uuid NOT NULL REFERENCES brand_saved_requirements(id),listing_id uuid NOT NULL REFERENCES marketplace_listings(id),listing_slug text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX requirement_alert_listing_uq ON requirement_alerts(requirement_id,listing_id);
