import "server-only";

import { assertPermission, assertTenant, type Actor } from "@/domain/authz";
import type { TecridAdapter } from "@/adapters/tecrid/types";
import { evaluateMatches } from "./engine";
import { denyGatedEvidence, unavailableIcsCertification, type MatchOffer, type MatchRequirement } from "./types";

const unavailableTecrid: TecridAdapter = {
  async verify() { throw new Error("Production TECRID transport is not approved or configured"); },
  async getStatus() { throw new Error("Production TECRID transport is not approved or configured"); },
};

/**
 * Request-local server entry for an authorized matching operator and server-loaded offers.
 * This is not a Server Action or a public endpoint. Callers must load the current
 * existing eligibility facts and explicitly reviewed PUBLIC evidence, never
 * accept those facts from form data. No inferred public visibility is allowed.
 *
 * No production mapping or transport is approved in this build. There is no
 * environment fallback, mock issuer or injected client policy on this path.
 * Enabling it requires a separately reviewed server configuration and adapter.
 * Evaluation receipts are never written to the database or shared cache.
 */
export async function evaluateServerMatches(actor: Actor, input: {
  requirement: MatchRequirement;
  offers: MatchOffer[];
  now?: Date;
}) {
  assertPermission(actor, "MANAGE_MATCHES");
  assertTenant(actor, input.requirement.buyerOrganizationId);
  return evaluateMatches({
    requirement: input.requirement,
    viewer: { userId: actor.userId, organizationId: actor.organizationId, visibility: "PUBLIC_ONLY" },
    offers: input.offers,
    now: input.now ?? new Date(),
  }, { tecrid: unavailableTecrid, ics: unavailableIcsCertification, authorization: denyGatedEvidence });
}
