import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "@neondatabase/serverless";
import { afterAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
const describeDatabase = databaseUrl ? describe : describe.skip;

async function withRollback(run: (client: PoolClient) => Promise<void>) {
  if (!pool) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await run(client);
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
}

async function createQualifiedFixture(client: PoolClient, verified: boolean) {
  const suffix = randomUUID();
  const supplierOrganizationId = randomUUID();
  const buyerOrganizationId = randomUUID();
  const profileId = randomUUID();
  const profileVersionId = randomUUID();
  const lotId = randomUUID();
  const samplingOrderId = randomUUID();
  const sampleId = randomUUID();
  const evidenceId = randomUUID();
  const decisionId = randomUUID();
  const now = new Date();
  const future = new Date(now.getTime() + 86_400_000);

  const productResult = await client.query<{ id: string }>(
    `insert into product_types (id, code, name)
     values ($1, 'COCOA_POWDER', 'Cocoa powder')
     on conflict (code) do update set name = product_types.name
     returning id`,
    [randomUUID()],
  );
  const productTypeId = productResult.rows[0].id;
  await client.query(
    `insert into organizations (id, name, slug, kind) values
     ($1, 'Trigger supplier', $2, 'SUPPLIER'),
     ($3, 'Trigger buyer', $4, 'BUYER')`,
    [supplierOrganizationId, `trigger-supplier-${suffix}`, buyerOrganizationId, `trigger-buyer-${suffix}`],
  );
  await client.query("insert into compliance_profiles (id, product_type_id, name) values ($1, $2, 'Trigger Cocoa Profile')", [profileId, productTypeId]);
  await client.query(
    `insert into compliance_profile_versions (id, profile_id, version, status, rules, notes, frozen_at)
     values ($1, $2, 'integration', 'FROZEN', '[]'::jsonb, 'INTEGRATION TEST ONLY', $3)`,
    [profileVersionId, profileId, now],
  );
  await client.query(
    `insert into physical_lots (
       id, supplier_organization_id, product_type_id, supplier_lot_code, status, quantity, quantity_unit,
       location_name, country_code, owner_name, identity_confirmed_at, quantity_verified_at,
       location_verified_at, authority_to_sell_verified_at
     ) values ($1, $2, $3, $4, 'QUALIFIED', 1000, 'kg', 'Test warehouse', 'US', 'Trigger supplier', $5, $5, $5, $5)`,
    [lotId, supplierOrganizationId, productTypeId, `TRIGGER-${suffix}`, verified ? now : null],
  );
  await client.query(
    "insert into sampling_orders (id, physical_lot_id, requested_by_organization_id, status) values ($1, $2, $3, 'COMPLETED')",
    [samplingOrderId, lotId, buyerOrganizationId],
  );
  await client.query(
    `insert into samples (id, sampling_order_id, physical_lot_id, sample_code, sampled_at, sampler_name, method, seal_identifiers, chain_of_custody)
     values ($1, $2, $3, $4, $5, 'Integration sampler', 'INTEGRATION TEST', '[]'::jsonb, '[]'::jsonb)`,
    [sampleId, samplingOrderId, lotId, `SAMPLE-${suffix}`, now],
  );
  await client.query(
    `insert into tecrid_evidence (id, sample_id, tecrid_id, issuer, status, issued_at, expires_at, results, payload_hash, verified_at)
     values ($1, $2, $3, 'INTEGRATION_TEST_ISSUER', 'CURRENT', $4, $5, '[]'::jsonb, $6, $4)`,
    [evidenceId, sampleId, `TECRID-${suffix}`, now, future, suffix.replaceAll("-", "")],
  );
  await client.query(
    `insert into qualification_decisions (id, physical_lot_id, sample_id, evidence_id, profile_version_id, outcome, rationale, engine_version, input_hash, decided_at)
     values ($1, $2, $3, $4, $5, 'QUALIFIED', '[]'::jsonb, 'integration', $6, $7)`,
    [decisionId, lotId, sampleId, evidenceId, profileVersionId, suffix.replaceAll("-", ""), now],
  );
  return { buyerOrganizationId, decisionId, lotId, profileVersionId, productTypeId, supplierOrganizationId, suffix };
}

afterAll(async () => {
  await pool?.end();
});

describeDatabase("Postgres compliance triggers", () => {
  it("rejects publication until every database publication-gate fact exists", async () => {
    await withRollback(async (client) => {
      const fixture = await createQualifiedFixture(client, false);
      await client.query("SAVEPOINT rejected_listing");
      let rejection = "";
      try {
        await client.query(
          "insert into marketplace_listings (physical_lot_id, qualification_decision_id, status, public_slug, published_at) values ($1, $2, 'LISTED', $3, now())",
          [fixture.lotId, fixture.decisionId, `rejected-${fixture.suffix}`],
        );
      } catch (error) {
        rejection = error instanceof Error ? error.message : String(error);
        await client.query("ROLLBACK TO SAVEPOINT rejected_listing");
      }
      expect(rejection).toMatch(/VLE publication gate rejected listing/);

      await client.query(
        "update physical_lots set identity_confirmed_at = now(), quantity_verified_at = now(), location_verified_at = now(), authority_to_sell_verified_at = now() where id = $1",
        [fixture.lotId],
      );
      const accepted = await client.query<{ status: string }>(
        "insert into marketplace_listings (physical_lot_id, qualification_decision_id, status, public_slug, published_at) values ($1, $2, 'LISTED', $3, now()) returning status",
        [fixture.lotId, fixture.decisionId, `accepted-${fixture.suffix}`],
      );
      expect(accepted.rows[0].status).toBe("LISTED");
    });
  });

  it("invalidates an active match and reservation intent when the listing unlists", async () => {
    await withRollback(async (client) => {
      const fixture = await createQualifiedFixture(client, true);
      const listingId = randomUUID();
      const requirementId = randomUUID();
      const matchId = randomUUID();
      const quoteId = randomUUID();
      const reservationId = randomUUID();
      await client.query(
        "insert into marketplace_listings (id, physical_lot_id, qualification_decision_id, status, public_slug, published_at) values ($1, $2, $3, 'LISTED', $4, now())",
        [listingId, fixture.lotId, fixture.decisionId, `commercial-${fixture.suffix}`],
      );
      await client.query(
        "insert into buyer_requirements (id, buyer_organization_id, product_type_id, profile_version_id, quantity, quantity_unit, destination) values ($1, $2, $3, $4, 500, 'kg', 'Integration destination')",
        [requirementId, fixture.buyerOrganizationId, fixture.productTypeId, fixture.profileVersionId],
      );
      await client.query(
        "insert into requirement_matches (id, buyer_requirement_id, marketplace_listing_id, profile_version_id, status, matched_at) values ($1, $2, $3, $4, 'ACTIVE', now())",
        [matchId, requirementId, listingId, fixture.profileVersionId],
      );
      await client.query(
        `insert into supplier_quotes (id, requirement_match_id, buyer_organization_id, supplier_organization_id, status, quantity, quantity_unit, unit_price, currency, expires_at)
         values ($1, $2, $3, $4, 'DRAFT', 500, 'kg', 4.25, 'USD', now() + interval '1 day')`,
        [quoteId, matchId, fixture.buyerOrganizationId, fixture.supplierOrganizationId],
      );
      await client.query("update supplier_quotes set status = 'SENT', sent_at = now() where id = $1", [quoteId]);
      await client.query("update supplier_quotes set status = 'ACCEPTED', accepted_at = now() where id = $1", [quoteId]);
      await client.query(
        `insert into reservation_intents (id, supplier_quote_id, requirement_match_id, marketplace_listing_id, buyer_organization_id, supplier_organization_id, status, expires_at)
         values ($1, $2, $3, $4, $5, $6, 'ACTIVE', now() + interval '12 hours')`,
        [reservationId, quoteId, matchId, listingId, fixture.buyerOrganizationId, fixture.supplierOrganizationId],
      );

      await client.query(
        "update marketplace_listings set status = 'UNLISTED', unpublished_at = now(), unpublish_reason = 'Integration invalidation' where id = $1",
        [listingId],
      );
      const match = await client.query<{ status: string; reason: string }>("select status, invalidation_reason as reason from requirement_matches where id = $1", [matchId]);
      const reservation = await client.query<{ status: string; reason: string }>("select status, status_reason as reason from reservation_intents where id = $1", [reservationId]);
      expect(match.rows[0]).toMatchObject({ status: "INVALIDATED", reason: "Integration invalidation" });
      expect(reservation.rows[0]).toMatchObject({ status: "INVALIDATED", reason: "Integration invalidation" });
    });
  });
});
