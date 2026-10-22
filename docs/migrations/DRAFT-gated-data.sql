-- DRAFT ONLY. Not in the migration runner or journal. NOT APPLIED.
-- Requires a separately approved migration and runtime DB role review.
BEGIN;
ALTER TABLE contaminant_documents ADD COLUMN visibility text NOT NULL DEFAULT 'PUBLIC'
  CHECK (visibility IN ('PUBLIC', 'GATED'));
CREATE TABLE gated_eligibility (id uuid PRIMARY KEY, sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE, payload jsonb NOT NULL CHECK (payload->>'id' = id::text));
CREATE TABLE gated_assignments (id uuid PRIMARY KEY, payload jsonb NOT NULL CHECK (payload->>'id' = id::text));
CREATE TABLE gated_versions (id uuid PRIMARY KEY, payload jsonb NOT NULL CHECK (payload->>'id' = id::text));
CREATE TABLE gated_invitations (id uuid PRIMARY KEY, payload jsonb NOT NULL CHECK (payload->>'id' = id::text));
CREATE TABLE gated_grants (id uuid PRIMARY KEY, invitation_id uuid NOT NULL UNIQUE REFERENCES gated_invitations(id), payload jsonb NOT NULL CHECK (payload->>'id' = id::text AND payload->>'invitationId' = invitation_id::text));
CREATE TABLE gated_events (id uuid PRIMARY KEY, sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE, payload jsonb NOT NULL CHECK (payload->>'id' = id::text));
CREATE TABLE gated_attempts (id text PRIMARY KEY, payload jsonb NOT NULL CHECK (payload->>'id' = id));
CREATE FUNCTION gated_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Gated history is append only'; END; $$;
CREATE TRIGGER gated_event_immutable BEFORE UPDATE OR DELETE ON gated_events FOR EACH ROW EXECUTE FUNCTION gated_append_only();
CREATE TRIGGER gated_eligibility_immutable BEFORE UPDATE OR DELETE ON gated_eligibility FOR EACH ROW EXECUTE FUNCTION gated_append_only();
-- No backfill, reference rewrite, real record import or production settings.
-- Operational DB role must not own tables or have TRUNCATE/DDL privileges.
COMMIT;
