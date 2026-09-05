import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertCommercialVisibility,
  assertQuoteTransition,
  assertReservationTransition,
  isEligibleRequirementMatch,
  statusAfterListingInvalidation,
} from "../commercial";

const now = new Date("2026-09-05T12:00:00Z");
const eligible = {
  requirementProductCode: "COCOA_POWDER",
  requirementProductTypeId: "cocoa",
  requirementProfileVersionId: "profile-v1",
  requirementQuantity: 2_000,
  requirementQuantityUnit: "kg",
  listingStatus: "LISTED" as const,
  listingProductTypeId: "cocoa",
  listingProfileVersionId: "profile-v1",
  availableQuantity: 12_000,
  availableQuantityUnit: "kg",
  decisionOutcome: "QUALIFIED" as const,
  profileStatus: "FROZEN" as const,
  evidenceStatus: "CURRENT" as const,
  evidenceExpiresAt: new Date("2027-09-05T12:00:00Z"),
  identityConfirmedAt: now, quantityVerifiedAt: now, locationVerifiedAt: now, authorityToSellVerifiedAt: now,
  heldAt: null, revokedAt: null, transformedAt: null, depletedAt: null,
};

describe("cocoa requirement matching", () => {
  it("matches only a currently eligible listing on the exact frozen profile", () => expect(isEligibleRequirementMatch(eligible, now)).toBe(true));
  it("rejects unlisted, wrong-profile, expired-evidence, and insufficient-quantity candidates", () => {
    expect(isEligibleRequirementMatch({ ...eligible, listingStatus: "UNLISTED" }, now)).toBe(false);
    expect(isEligibleRequirementMatch({ ...eligible, listingProfileVersionId: "profile-v2" }, now)).toBe(false);
    expect(isEligibleRequirementMatch({ ...eligible, evidenceExpiresAt: now }, now)).toBe(false);
    expect(isEligibleRequirementMatch({ ...eligible, availableQuantity: 1_999 }, now)).toBe(false);
    expect(isEligibleRequirementMatch({ ...eligible, availableQuantityUnit: "lb" }, now)).toBe(false);
    expect(isEligibleRequirementMatch({ ...eligible, authorityToSellVerifiedAt: null }, now)).toBe(false);
  });
  it("keeps the pilot cocoa-only", () => expect(isEligibleRequirementMatch({ ...eligible, requirementProductCode: "OTHER" }, now)).toBe(false));
});

describe("commercial state machines", () => {
  const future = new Date("2026-09-06T12:00:00Z");
  const past = new Date("2026-09-04T12:00:00Z");
  it("allows the quote draft → sent → accepted path", () => {
    expect(() => assertQuoteTransition("DRAFT", "SENT", future, now)).not.toThrow();
    expect(() => assertQuoteTransition("SENT", "ACCEPTED", future, now)).not.toThrow();
  });
  it("prohibits skipping quote states and advancing an expired quote", () => {
    expect(() => assertQuoteTransition("DRAFT", "ACCEPTED", future, now)).toThrowError(/cannot transition/);
    expect(() => assertQuoteTransition("DRAFT", "SENT", past, now)).toThrowError(/Expired/);
    expect(() => assertQuoteTransition("ACCEPTED", "WITHDRAWN", future, now)).toThrowError(/cannot transition/);
  });
  it("expires only after the explicit quote expiry", () => {
    expect(() => assertQuoteTransition("SENT", "EXPIRED", future, now)).toThrowError(/cannot expire before/);
    expect(() => assertQuoteTransition("SENT", "EXPIRED", past, now)).not.toThrow();
  });
  it("makes reservation terminal states final", () => {
    expect(() => assertReservationTransition("ACTIVE", "CANCELLED", future, now)).not.toThrow();
    expect(() => assertReservationTransition("CANCELLED", "ACTIVE", future, now)).toThrowError(/cannot transition/);
  });
  it("invalidates an active reservation when its listing invalidates", () => {
    expect(statusAfterListingInvalidation("ACTIVE")).toBe("INVALIDATED");
    expect(statusAfterListingInvalidation("CANCELLED")).toBe("CANCELLED");
  });
});

describe("commercial tenant visibility", () => {
  const buyer = { userId: "buyer", organizationId: "buyer-a", roles: ["BUYER"] as const };
  const supplier = { userId: "supplier", organizationId: "supplier-a", roles: ["SUPPLIER"] as const };
  it("allows only the buyer and supplier organizations bound to the record", () => {
    expect(() => assertCommercialVisibility(buyer, "buyer-a", "supplier-a")).not.toThrow();
    expect(() => assertCommercialVisibility(supplier, "buyer-a", "supplier-a")).not.toThrow();
    expect(() => assertCommercialVisibility({ ...buyer, organizationId: "buyer-b" }, "buyer-a", "supplier-a")).toThrowError(/Cross-organization/);
    expect(() => assertCommercialVisibility({ ...buyer, organizationId: "supplier-a" }, "buyer-a", "supplier-a")).toThrowError(/Cross-organization/);
  });
  it("allows managed platform operations across parties", () => expect(() => assertCommercialVisibility({ userId: "ops", organizationId: "platform", roles: ["OPS"] }, "buyer-a", "supplier-a")).not.toThrow());
});

describe("database commercial backstops", () => {
  const migration = readFileSync(new URL("../../../drizzle/0002_silent_molecule_man.sql", import.meta.url), "utf8");
  it("invalidates matches and active reservation intents when a listing unlists", () => {
    expect(migration).toContain("listing_unlist_invalidates_commercial_intent");
    expect(migration).toMatch(/UPDATE requirement_matches SET status = 'INVALIDATED'/);
    expect(migration).toMatch(/UPDATE reservation_intents SET status = 'INVALIDATED'/);
  });
  it("enforces matching and both state machines in Postgres", () => {
    expect(migration).toContain("requirement_match_gate");
    expect(migration).toContain("supplier_quote_state_machine");
    expect(migration).toContain("reservation_intent_state_machine");
  });
});
