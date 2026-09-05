import { describe, expect, it } from "vitest";
import { evaluatePublicationGate, shouldAutomaticallyUnlist } from "../publication";

const now = new Date("2026-01-01T00:00:00Z");
const eligible = { identityConfirmedAt: now, quantityVerifiedAt: now, locationVerifiedAt: now, authorityToSellVerifiedAt: now, samplingRecorded: true, evidenceStatus: "CURRENT" as const, evidenceExpiresAt: new Date("2027-01-01T00:00:00Z"), decisionOutcome: "QUALIFIED" as const, profileFrozen: true, heldAt: null, revokedAt: null, transformedAt: null, depletedAt: null };

describe("publication gate", () => {
  it("allows only a completely eligible lot", () => expect(evaluatePublicationGate(eligible, now)).toEqual({ allowed: true }));
  it("keeps NOT_QUALIFIED private", () => expect(evaluatePublicationGate({ ...eligible, decisionOutcome: "NOT_QUALIFIED" }, now)).toMatchObject({ allowed: false }));
  it("rejects supplier PDF-like evidence without a recorded sample", () => expect(evaluatePublicationGate({ ...eligible, samplingRecorded: false }, now)).toMatchObject({ allowed: false }));
  it("automatically unlists on revoke", () => expect(shouldAutomaticallyUnlist({ ...eligible, evidenceStatus: "REVOKED" }, now)).toBe(true));
  it("automatically unlists on expiry or hold", () => {
    expect(shouldAutomaticallyUnlist({ ...eligible, evidenceExpiresAt: new Date("2025-01-01") }, now)).toBe(true);
    expect(shouldAutomaticallyUnlist({ ...eligible, heldAt: now }, now)).toBe(true);
  });
});
