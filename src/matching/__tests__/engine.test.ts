import { describe, expect, it, vi } from "vitest";
import { MockTecridIssuer } from "../../adapters/tecrid/mock";
import { evaluateMatches } from "../engine";
import { denyGatedEvidence, unavailableIcsCertification, type CertificationResult, type MatchOffer } from "../types";
import { FAKE_NOW, FAKE_RECENT, FAKE_REQUIREMENT, FAKE_VIEWER, fakeAdapter, fakeCertificate, fakeOffer, fakePolicy } from "./fixtures";

// TEST-ONLY FAKE inputs and numeric policy throughout. No external service is used.
const inputFor = (offers: MatchOffer[]) => ({
  requirement: structuredClone(FAKE_REQUIREMENT), viewer: structuredClone(FAKE_VIEWER), offers, config: fakePolicy(), now: new Date(FAKE_NOW),
});
const evaluate = async (offers: MatchOffer[]) => evaluateMatches(inputFor(offers), { tecrid: fakeAdapter(offers).adapter });

function expectUnranked(result: Awaited<ReturnType<typeof evaluateMatches>>, reason: RegExp) {
  expect(result.ranked).toHaveLength(0);
  expect(result.unrankable).toHaveLength(1);
  expect(result.unrankable[0].best).toMatchObject({ outcome: "UNRANKABLE", q: null, bonus: null, rank: null });
  expect(result.unrankable[0].best.reasons.join("; ")).toMatch(reason);
}

describe("contamination-first matching", () => {
  it("never lets a large certification bonus lift a worse contamination grade", async () => {
    const better = fakeOffer("FAKE_Z", "FAKE_BETTER", ["0.5", "0.5"]);
    const worse = fakeOffer("FAKE_A", "FAKE_WORSE", ["0.5", "5"]);
    const result = await evaluateMatches(inputFor([worse, better]), {
      tecrid: fakeAdapter([worse, better]).adapter,
      ics: { verify: async (offer) => offer.id === worse.id ? fakeCertificate(offer) : { status: "unavailable" } },
    });
    expect(result.ranked.map((group) => group.best.offer.lotId)).toEqual([better.lotId, worse.lotId]);
    expect(result.ranked[0].best).toMatchObject({ q: "100.10", bonus: "2.50", rank: 1 });
    expect(result.ranked[1].best).toMatchObject({ q: "100.01", bonus: "10002.75", rank: 2 });
  });

  it("uses bonuses only inside equal contamination utility and reports exact components", async () => {
    const ordinary = fakeOffer("FAKE_A", "FAKE_A");
    const certified = fakeOffer("FAKE_Z", "FAKE_Z");
    const result = await evaluateMatches(inputFor([ordinary, certified]), {
      tecrid: fakeAdapter([ordinary, certified]).adapter,
      ics: { verify: async (offer) => offer.id === certified.id ? fakeCertificate(offer) : { status: "unavailable" } },
    });
    const receipt = result.ranked[0].best;
    expect(receipt.offer.id).toBe(certified.id);
    expect(receipt.q).toBe("100.10");
    expect(receipt.tecrid.contribution).toBe("2.50");
    expect(receipt.ics.contribution).toBe("10000.25");
    expect(receipt.bonus).toBe("10002.75");
  });

  it("uses the least favorable analyte and improves monotonically without changing the panel", async () => {
    const offer = fakeOffer("FAKE_A", "FAKE_A", ["0.5", "5"]);
    const before = (await evaluate([offer])).ranked[0].best;
    offer.evidence[0].measurements[1].value = "0.5";
    const after = (await evaluate([offer])).ranked[0].best;
    expect(before.q).toBe("100.01"); expect(after.q).toBe("100.10");
    expect(before.analytes).toHaveLength(2); expect(after.analytes).toHaveLength(2);
  });

  it("uses stable IDs for presentation while equal scientific ranks remain tied", async () => {
    const a = fakeOffer("FAKE_A", "FAKE_LOT_Z");
    const z = fakeOffer("FAKE_Z", "FAKE_LOT_A");
    const first = await evaluate([z, a]);
    const second = await evaluate([a, z]);
    expect(first).toEqual(second);
    expect(first.ranked.map((g) => g.supplierId)).toEqual(["FAKE_A", "FAKE_Z"]);
    expect(first.ranked.map((g) => g.best.rank)).toEqual([1, 1]);
  });

  it("groups a supplier by the exact best offered lot and keeps its other lots inspectable", async () => {
    const worse = fakeOffer("FAKE_A", "FAKE_LOT_A", ["5", "5"]);
    const best = fakeOffer("FAKE_A", "FAKE_LOT_Z");
    const result = await evaluate([worse, best]);
    expect(result.ranked).toHaveLength(1);
    expect(result.ranked[0].best.offer.lotId).toBe(best.lotId);
    expect(result.ranked[0].otherLots.map((r) => r.offer.lotId)).toEqual([worse.lotId]);
  });

  it("deduplicates identical evidence and listings without multiplying bonuses or suppliers", async () => {
    const offer = fakeOffer();
    const baseline = await evaluate([offer]);
    offer.evidence.push({ ...structuredClone(offer.evidence[0]), id: "FAKE_ALIAS_EVIDENCE" });
    const duplicate = { ...structuredClone(offer), id: "FAKE_DUPLICATE_LISTING" };
    const result = await evaluate([offer, duplicate]);
    expect(result.ranked).toHaveLength(1);
    expect(result.ranked[0].otherLots).toHaveLength(0);
    expect(result.ranked[0].best.sources).toHaveLength(1);
    expect(result.ranked[0].best.bonus).toBe(baseline.ranked[0].best.bonus);
  });

  it("does not choose a favorable current sample over conflicting current evidence", async () => {
    const offer = fakeOffer();
    offer.evidence.push({ ...structuredClone(offer.evidence[0]), tecridId: "FAKE_SECOND_CURRENT", sampleCode: "FAKE_OTHER_SAMPLE" });
    expectUnranked(await evaluate([offer]), /Conflicting current evidence/);
  });

  it("rejects conflicting copies of one authenticated report", async () => {
    const offer = fakeOffer();
    const duplicate = structuredClone(offer.evidence[0]);
    duplicate.measurements[0].value = "5"; offer.evidence.push(duplicate);
    expectUnranked(await evaluate([offer]), /Conflicting copies/);
  });

  it("ignores explicitly superseded evidence while retaining the authoritative current report", async () => {
    const offer = fakeOffer();
    const old = structuredClone(offer.evidence[0]);
    old.historyStatus = "SUPERSEDED"; old.reportVersion = "FAKE_OLD_VERSION"; old.tecridId = "FAKE_OLD_TECRID"; old.measurements[0].value = "5";
    offer.evidence.push(old);
    expect((await evaluate([offer])).ranked[0].best.q).toBe("100.10");
  });

  it("withholds conflicting duplicate physical-lot offers instead of choosing the best one", async () => {
    const offer = fakeOffer();
    const conflicting = structuredClone(offer);
    conflicting.id = "FAKE_DUPLICATE"; conflicting.evidence[0].tecridId = "FAKE_OTHER_TECRID";
    conflicting.evidence[0].measurements[0].value = "5";
    expectUnranked(await evaluate([offer, conflicting]), /Conflicting offers for the same physical lot/);
  });

  it("returns a reproducible source and policy snapshot without mutating caller input", async () => {
    const offer = fakeOffer(); const input = inputFor([offer]); const before = structuredClone(input);
    const adapter = fakeAdapter([offer]);
    const first = await evaluateMatches(input, { tecrid: adapter.adapter });
    expect(input).toEqual(before);
    const second = await evaluateMatches(input, { tecrid: adapter.adapter });
    expect(second).toEqual(first);
    const receipt = first.ranked[0].best;
    expect(receipt.policy?.MATCH_POLICY_VERSION.id).toBe("FAKE_POLICY_1");
    expect(receipt.sources[0]).toMatchObject({ payloadHash: offer.evidence[0].payloadHash, reportVersion: "FAKE_REPORT_V1", sampleCode: offer.evidence[0].sampleCode });
    expect(receipt.analytes[0]).toMatchObject({ value: "0.5", unit: "ppm", label: "VLE ranking policy", regulatoryMapping: "NO_REGULATORY_LIMIT_MAPPED" });
    input.config.MATCH_GRADE_UTILITY.FAKE_A = "999";
    input.offers[0].evidence[0].measurements[0].value = "999";
    expect(receipt.q).toBe("100.10"); expect(receipt.analytes[0].value).toBe("0.5");
  });
});

describe("fixed panel and evidence compatibility", () => {
  it("has no score or verification calls without an approved policy", async () => {
    const offer = fakeOffer(); const verify = vi.fn();
    const result = await evaluateMatches({ ...inputFor([offer]), config: undefined }, { tecrid: { verify, getStatus: vi.fn() } });
    expectUnranked(result, /No approved grade mapping/); expect(verify).not.toHaveBeenCalled();
  });

  it.each(["NON_DETECT", "CENSORED", "LIMIT_ONLY"] as const)("rejects %s instead of substituting a precise value", async (qualifier) => {
    const offer = fakeOffer(); offer.evidence[0].measurements[0].qualifier = qualifier;
    expectUnranked(await evaluate([offer]), /not rankable/);
  });

  it("rejects a missing required analyte instead of reducing the fixed panel", async () => {
    const offer = fakeOffer(); offer.evidence[0].measurements.pop();
    expectUnranked(await evaluate([offer]), /Missing or conflicting panel result/);
  });

  it.each(["unit", "species", "basis", "matrix", "method"] as const)("rejects an incompatible %s without conversion", async (field) => {
    const offer = fakeOffer(); offer.evidence[0].measurements[0][field] = "FAKE_INCOMPATIBLE";
    expectUnranked(await evaluate([offer]), /Unverified measured result|Incomparable/);
  });

  it.each(["NaN", "Infinity", "-1", "1e3", "0.1234567890123456789"])("does not rank an unsupported or inexact measured value %s", async (value) => {
    const offer = fakeOffer(); offer.evidence[0].measurements[0].value = value;
    expectUnranked(await evaluate([offer]), /Unverified measured result|invalid|Invalid/i);
  });

  it("does not assign a fallback grade above the final mapped band", async () => {
    const offer = fakeOffer("FAKE_A", "FAKE_A", ["100", "0.5"]);
    expectUnranked(await evaluate([offer]), /No approved grade mapping/);
  });

  it.each(["productTypeId", "profileVersionId", "intendedUse", "jurisdiction"] as const)("requires matching %s scope", async (key) => {
    const offer = fakeOffer(); offer.scope[key] = "FAKE_WRONG_SCOPE";
    expectUnranked(await evaluate([offer]), /mismatch/);
  });

  it.each(["supplierId", "lotId", "bindingReviewedBy", "bindingReference"] as const)("requires reviewed evidence binding for %s", async (key) => {
    const offer = fakeOffer(); offer.evidence[0][key] = key.startsWith("binding") ? "" : "FAKE_WRONG_SUBJECT";
    expectUnranked(await evaluate([offer]), /binding|invalid/i);
  });

  it("rejects an edition and policy that are not yet effective", async () => {
    const offer = fakeOffer(); const input = inputFor([offer]);
    input.config.MATCH_STANDARD_MAPPING[0].effectiveAt = "2036-01-01T00:00:00Z";
    expectUnranked(await evaluateMatches(input, { tecrid: fakeAdapter([offer]).adapter }), /Source edition/);
    input.config = fakePolicy(); input.config.MATCH_POLICY_VERSION.effectiveAt = "2036-01-01T00:00:00Z";
    expectUnranked(await evaluateMatches(input, { tecrid: fakeAdapter([offer]).adapter }), /not yet effective/);
  });
});

describe("existing listing gate is never relaxed by a score", () => {
  it.each([
    ["unlisted", (o: MatchOffer) => { o.eligibility.listingStatus = "UNLISTED"; }],
    ["wrong profile", (o: MatchOffer) => { o.eligibility.listingProfileVersionId = "FAKE_OTHER"; }],
    ["insufficient inventory", (o: MatchOffer) => { o.eligibility.availableQuantity = 1; }],
    ["quantity unit", (o: MatchOffer) => { o.eligibility.availableQuantityUnit = "FAKE_OTHER_UNIT"; }],
    ["not qualified", (o: MatchOffer) => { o.eligibility.decisionOutcome = "NOT_QUALIFIED"; }],
    ["unfrozen profile", (o: MatchOffer) => { o.eligibility.profileStatus = "DRAFT"; }],
    ["revoked", (o: MatchOffer) => { o.eligibility.evidenceStatus = "REVOKED"; }],
    ["expired", (o: MatchOffer) => { o.eligibility.evidenceExpiresAt = new Date(FAKE_NOW); }],
    ["held", (o: MatchOffer) => { o.eligibility.heldAt = new Date(FAKE_RECENT); }],
    ["transformed", (o: MatchOffer) => { o.eligibility.transformedAt = new Date(FAKE_RECENT); }],
    ["depleted", (o: MatchOffer) => { o.eligibility.depletedAt = new Date(FAKE_RECENT); }],
    ["unknown authority", (o: MatchOffer) => { o.eligibility.authorityToSellVerifiedAt = null; }],
    ["non-cocoa", (o: MatchOffer) => { o.eligibility.requirementProductCode = "FAKE_OTHER_PRODUCT"; }],
    ["different requested quantity", (o: MatchOffer) => { o.eligibility.requirementQuantity = 1; }],
  ] as const)("excludes %s despite otherwise good evidence", async (_name, change) => {
    const offer = fakeOffer(); change(offer);
    const verify = vi.fn();
    const result = await evaluateMatches(inputFor([offer]), { tecrid: { verify, getStatus: vi.fn() } });
    expect(result.ranked).toHaveLength(0); expect(result.unrankable).toHaveLength(0);
    expect(result.excluded).toHaveLength(1); expect(result.excluded[0].q).toBeNull();
    expect(verify).not.toHaveBeenCalled();
  });

  it("reevaluates invalidation on the next request without reusing the earlier rank", async () => {
    const offer = fakeOffer(); expect((await evaluate([offer])).ranked).toHaveLength(1);
    offer.eligibility.listingStatus = "UNLISTED";
    expect((await evaluate([offer])).excluded).toHaveLength(1);
  });
});

describe("verification authenticity, freshness and optional certification", () => {
  it.each(["sampleCode", "payloadHash", "tecridId"] as const)("rejects a wrong verified %s binding", async (field) => {
    const offer = fakeOffer(); const adapter = fakeAdapter([offer]);
    adapter.envelopes.get(offer.evidence[0].tecridId)![field] = "FAKE_WRONG";
    expectUnranked(await evaluateMatches(inputFor([offer]), { tecrid: adapter.adapter }), /binding mismatch/);
  });

  it("requires authenticated measurements to match reported values", async () => {
    const offer = fakeOffer(); const adapter = fakeAdapter([offer]);
    adapter.envelopes.get(offer.evidence[0].tecridId)!.results = [{ analyte: "lead", valuePpm: 5, unit: "ppm" }, { analyte: "cadmium", valuePpm: 0.5, unit: "ppm" }];
    expectUnranked(await evaluateMatches(inputFor([offer]), { tecrid: adapter.adapter }), /Unverified measured result/);
  });

  it("refuses the shipped mock issuer even if a caller attempts to allowlist its identifiers", async () => {
    const offer = fakeOffer(); const evidence = offer.evidence[0];
    const adapter = new MockTecridIssuer({ [evidence.tecridId]: { sampleCode: evidence.sampleCode, results: [{ analyte: "lead", valuePpm: 0.5, unit: "ppm" }, { analyte: "cadmium", valuePpm: 0.5, unit: "ppm" }] } }, () => FAKE_NOW);
    const issued = await adapter.verify({ tecridId: evidence.tecridId, expectedSampleCode: evidence.sampleCode });
    evidence.payloadHash = issued.payloadHash;
    const input = inputFor([offer]);
    input.config.MATCH_VERIFICATION_FRESHNESS_POLICY = { ...input.config.MATCH_VERIFICATION_FRESHNESS_POLICY, contractVersions: [issued.contractVersion], issuers: [issued.issuer], authenticationMethods: [issued.authentication.method] };
    expectUnranked(await evaluateMatches(input, { tecrid: adapter }), /Mock receipts/);
  });

  it.each(["revoked", "expired", "stale", "future check", "unapproved authority", "unapproved authentication"])("withholds scores for %s receipts", async (state) => {
    const offer = fakeOffer(); const adapter = fakeAdapter([offer]); const id = offer.evidence[0].tecridId;
    const envelope = adapter.envelopes.get(id)!; const status = adapter.statuses.get(id)!;
    if (state === "revoked") status.status = "REVOKED";
    if (state === "expired") envelope.expiresAt = FAKE_NOW.toISOString();
    if (state === "stale") status.checkedAt = "2030-01-01T00:00:00Z";
    if (state === "future check") status.checkedAt = "2036-01-01T00:00:00Z";
    if (state === "unapproved authority") envelope.issuer = "FAKE_UNAPPROVED";
    if (state === "unapproved authentication") status.authentication.method = "FAKE_UNAPPROVED";
    expectUnranked(await evaluateMatches(inputFor([offer]), { tecrid: adapter.adapter }), /revoked|expired|stale|invalid|unapproved/);
  });

  it("withholds scores when verification is unavailable", async () => {
    const offer = fakeOffer();
    expectUnranked(await evaluateMatches(inputFor([offer]), { tecrid: { verify: async () => { throw new Error("FAKE outage"); }, getStatus: async () => { throw new Error("FAKE outage"); } } }), /unavailable/);
  });

  it("ships only an unavailable ICS adapter, leaving a rankable offer with no certification bonus", async () => {
    const offer = fakeOffer();
    expect(await unavailableIcsCertification.verify(offer, FAKE_NOW.toISOString())).toEqual({ status: "unavailable" });
    const receipt = (await evaluate([offer])).ranked[0].best;
    expect(receipt.ics).toEqual({ status: "unavailable", contribution: "0" });
    expect(receipt.bonus).toBe("2.50");
  });

  it.each(["unavailable", "unverified", "expired", "revoked", "out_of_scope"] as const)("awards no optional bonus for ICS status %s", async (status) => {
    const offer = fakeOffer();
    const result = await evaluateMatches(inputFor([offer]), { tecrid: fakeAdapter([offer]).adapter, ics: { verify: async () => ({ status }) } });
    expect(result.ranked[0].best.ics).toEqual({ status, contribution: "0" });
  });

  it.each(["supplier", "product", "profile", "program", "standard", "expiry", "freshness"])("checks certificate %s independently of a claimed verified status", async (field) => {
    const offer = fakeOffer(); const certificate = fakeCertificate(offer);
    if (field === "supplier") certificate.supplierId = "FAKE_OTHER";
    if (field === "product") certificate.productTypeId = "FAKE_OTHER";
    if (field === "profile") certificate.profileVersionId = "FAKE_OTHER";
    if (field === "program") certificate.program = "FAKE_WRONG_PROGRAM";
    if (field === "standard") certificate.standardVersion = "FAKE_WRONG_STANDARD";
    if (field === "expiry") certificate.validUntil = FAKE_NOW.toISOString();
    if (field === "freshness") certificate.checkedAt = "2030-01-01T00:00:00Z";
    const result = await evaluateMatches(inputFor([offer]), { tecrid: fakeAdapter([offer]).adapter, ics: { verify: async (): Promise<CertificationResult> => certificate } });
    expect(result.ranked[0].best.ics.contribution).toBe("0");
    expect(result.ranked[0].best.bonus).toBe("2.50");
  });
});

describe("gated evidence is neither used nor disclosed", () => {
  it("denies gated authorization by default", async () => {
    const offer = fakeOffer(); offer.evidence[0].visibility = "GATED";
    expect(await denyGatedEvidence.canUse(FAKE_VIEWER, offer.evidence[0])).toBe(false);
  });

  it("returns the same generic unavailable result for absent evidence and multiple hidden records", async () => {
    const empty = fakeOffer(); empty.evidence = [];
    const hidden = fakeOffer(); hidden.evidence[0].visibility = "GATED";
    hidden.evidence.push({ ...structuredClone(hidden.evidence[0]), id: "FAKE_SECRET_FILENAME_TWO" });
    hidden.evidence[0].id = "FAKE_SECRET_FILENAME_ONE";
    const result = await evaluate([hidden]);
    expect(result).toEqual(await evaluate([empty]));
    expectUnranked(result, /Authorized evidence unavailable/);
    expect(JSON.stringify(result)).not.toContain("FAKE_SECRET");
    expect(result.unrankable[0].best.sources).toEqual([]);
  });

  it("does not use gated evidence for public derived disclosure even with an affirmative grant", async () => {
    const offer = fakeOffer(); offer.evidence[0].visibility = "GATED";
    const verify = vi.fn(); const grant = vi.fn(async () => true);
    const result = await evaluateMatches(inputFor([offer]), { tecrid: { verify, getStatus: vi.fn() }, authorization: { canUse: grant } });
    expectUnranked(result, /Authorized evidence unavailable/); expect(verify).not.toHaveBeenCalled();
  });

  it("ignores hidden adverse evidence without changing a public-only rank or exposing it", async () => {
    const offer = fakeOffer(); const baseline = await evaluate([offer]);
    const hidden = structuredClone(offer.evidence[0]); hidden.visibility = "GATED"; hidden.id = "FAKE_PRIVATE_ADVERSE"; hidden.measurements[0].value = "999";
    offer.evidence.push(hidden);
    const adapter = fakeAdapter([fakeOffer()]);
    const result = await evaluateMatches(inputFor([offer]), { tecrid: adapter.adapter });
    expect(result).toEqual(baseline); expect(JSON.stringify(result)).not.toContain("FAKE_PRIVATE_ADVERSE");
  });

  it("does not echo authorization failures or disclose records when grants disappear", async () => {
    const offer = fakeOffer(); offer.evidence[0].visibility = "GATED";
    const result = await evaluateMatches(inputFor([offer]), { tecrid: fakeAdapter([offer]).adapter, authorization: { canUse: async () => { throw new Error("FAKE_SECRET_GRANT"); } } });
    expectUnranked(result, /Authorized evidence unavailable/); expect(JSON.stringify(result)).not.toContain("FAKE_SECRET_GRANT");
  });

  it("rejects a viewer outside the requirement buyer organization", async () => {
    const offer = fakeOffer(); const input = inputFor([offer]); input.viewer.organizationId = "FAKE_OTHER_BUYER";
    await expect(evaluateMatches(input, { tecrid: fakeAdapter([offer]).adapter })).rejects.toThrow(/access denied/);
  });
});

describe("request snapshot integrity", () => {
  it("strips unknown fields from contexts, sources and analyte explanations", async () => {
    const baselineOffer = fakeOffer(); const baseline = await evaluate([baselineOffer]);
    const input = inputFor([fakeOffer()]);
    Object.assign(input.requirement, { privateAttachmentUrl: "FAKE_PRIVATE_REQUIREMENT_URL" });
    Object.assign(input.viewer, { secret: "FAKE_PRIVATE_VIEWER_FIELD" });
    Object.assign(input.offers[0], { privateFilename: "FAKE_PRIVATE_OFFER_NAME" });
    Object.assign(input.offers[0].evidence[0], { signedUrl: "FAKE_PRIVATE_SOURCE_URL" });
    Object.assign(input.offers[0].evidence[0].measurements[0], { privateAnnotation: "FAKE_PRIVATE_ANALYTE_NOTE" });
    const result = await evaluateMatches(input, { tecrid: fakeAdapter([baselineOffer]).adapter });
    expect(result).toEqual(baseline);
    expect(JSON.stringify(result)).not.toContain("FAKE_PRIVATE");
  });

  it("ignores caller policy, time, evidence and membership mutations during verification", async () => {
    const originalOffers = [fakeOffer("FAKE_A", "FAKE_A"), fakeOffer("FAKE_B", "FAKE_B")];
    const baseline = await evaluate(originalOffers);
    const input = inputFor(structuredClone(originalOffers));
    const { adapter } = fakeAdapter(originalOffers);
    const result = await evaluateMatches(input, {
      tecrid: {
        verify: async (request) => {
          input.config.MATCH_GRADE_UTILITY.FAKE_A = "999";
          input.requirement.quantity = 999;
          input.viewer.organizationId = "FAKE_CHANGED_ORGANIZATION";
          input.offers[1].evidence[0].measurements[0].value = "999";
          input.now.setUTCFullYear(2040);
          return adapter.verify(request);
        },
        getStatus: (id) => adapter.getStatus(id),
      },
    });
    expect(result).toEqual(baseline);
  });

  it("selects the same canonical evidence copy regardless of input order", async () => {
    const offer = fakeOffer();
    const copy = structuredClone(offer.evidence[0]); copy.id = "FAKE_A_CANONICAL_ID";
    copy.measurements.reverse(); offer.evidence.push(copy);
    const first = await evaluate([offer]); offer.evidence.reverse();
    const second = await evaluate([offer]);
    expect(first).toEqual(second);
    expect(first.ranked[0].best.sources[0].id).toBe("FAKE_A_CANONICAL_ID");
  });

  it("does not accept a self-consistent but different requested quantity unit", async () => {
    const offer = fakeOffer();
    offer.eligibility.requirementQuantityUnit = "FAKE_OTHER_UNIT";
    offer.eligibility.availableQuantityUnit = "FAKE_OTHER_UNIT";
    const result = await evaluate([offer]);
    expect(result.excluded).toHaveLength(1); expect(result.ranked).toHaveLength(0);
  });
});

describe("actual requirement quantity validation", () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects the invalid requested quantity %s", async (quantity) => {
    const offer = fakeOffer(); const input = inputFor([offer]); input.requirement.quantity = quantity;
    const verify = vi.fn();
    await expect(evaluateMatches(input, { tecrid: { verify, getStatus: vi.fn() } })).rejects.toThrow(/Invalid comparison context/);
    expect(verify).not.toHaveBeenCalled();
  });
});

describe("adapter isolation", () => {
  it("does not let an authorization callback rewrite viewer or evidence state", async () => {
    const offer = fakeOffer(); const hidden = structuredClone(offer.evidence[0]);
    hidden.visibility = "GATED"; hidden.id = "FAKE_PRIVATE_ID"; offer.evidence.push(hidden);
    const baseline = await evaluateMatches(inputFor([offer]), { tecrid: fakeAdapter([fakeOffer()]).adapter });
    const result = await evaluateMatches(inputFor([offer]), {
      tecrid: fakeAdapter([fakeOffer()]).adapter,
      authorization: { canUse: async (viewer, evidence) => {
        viewer.organizationId = "FAKE_WRONG_VIEWER";
        evidence.visibility = "PUBLIC";
        evidence.id = "FAKE_PRIVATE_CHANGED_ID";
        return true;
      } },
    });
    expect(result).toEqual(baseline);
    expect(JSON.stringify(result)).not.toContain("FAKE_PRIVATE");
    expect(JSON.stringify(result)).not.toContain("FAKE_WRONG_VIEWER");
  });

  it("does not let a certification callback rewrite the selected lot or eligibility snapshot", async () => {
    const offer = fakeOffer(); const baseline = await evaluate([offer]);
    const result = await evaluateMatches(inputFor([offer]), {
      tecrid: fakeAdapter([offer]).adapter,
      ics: { verify: async (candidate) => {
        candidate.id = "FAKE_CHANGED_OFFER";
        candidate.supplierId = "FAKE_CHANGED_SUPPLIER";
        candidate.lotId = "FAKE_CHANGED_LOT";
        candidate.eligibility.availableQuantity = 0;
        return { status: "unavailable" };
      } },
    });
    expect(result).toEqual(baseline);
  });
});

describe("source freshness cannot be renewed by a status check", () => {
  it.each(["collectedAt", "reportedAt"] as const)("withholds an old %s even with current authentication and status", async (field) => {
    const offer = fakeOffer();
    offer.evidence[0][field] = "2030-01-01T00:00:00.000Z";
    if (field === "reportedAt") offer.evidence[0].collectedAt = "2029-12-31T00:00:00.000Z";
    const result = await evaluate([offer]);
    expectUnranked(result, /Collection or report dates.*stale|Collection or report dates.*invalid/i);
  });

  it("withholds an old receipt issue date despite a fresh verification and status check", async () => {
    const offer = fakeOffer(); const adapter = fakeAdapter([offer]);
    adapter.envelopes.get(offer.evidence[0].tecridId)!.issuedAt = "2030-01-01T00:00:00.000Z";
    expectUnranked(await evaluateMatches(inputFor([offer]), { tecrid: adapter.adapter }), /expired|stale|invalid/i);
  });
});

describe("reported measurement limits", () => {
  it.each(["detectionLimit", "quantificationLimit"] as const)("withholds a result below its decimal %s without repairing the source", async (field) => {
    const offer = fakeOffer(); offer.evidence[0].measurements[0][field] = "1";
    const before = structuredClone(offer);
    expectUnranked(await evaluate([offer]), /below a supplied detection or quantification limit/);
    expect(offer).toEqual(before);
  });
});

describe("request-local authoritative status snapshots", () => {
  it("checks duplicate listings once per evaluation and checks status again on the next request", async () => {
    const offer = fakeOffer(); const duplicate = structuredClone(offer); duplicate.id = "FAKE_DUPLICATE_LISTING";
    const input = inputFor([offer, duplicate]); const source = fakeAdapter([offer]);
    let statusChecks = 0;
    const verify = vi.fn((request: Parameters<typeof source.adapter.verify>[0]) => source.adapter.verify(request));
    const getStatus = vi.fn(async (id: string) => {
      const status = await source.adapter.getStatus(id);
      statusChecks += 1;
      status.checkedAt = new Date(Date.parse(FAKE_RECENT) + statusChecks * 1_000).toISOString();
      status.authentication.verifiedAt = status.checkedAt;
      if (statusChecks > 1) status.status = "REVOKED";
      return status;
    });
    const first = await evaluateMatches(input, { tecrid: { verify, getStatus } });
    expect(first.ranked).toHaveLength(1);
    expect(first.ranked[0].best.q).toBe("100.10");
    expect(first.ranked[0].otherLots).toHaveLength(0);
    expect(verify).toHaveBeenCalledTimes(1); expect(getStatus).toHaveBeenCalledTimes(1);
    const next = await evaluateMatches(input, { tecrid: { verify, getStatus } });
    expectUnranked(next, /revoked/);
    expect(verify).toHaveBeenCalledTimes(2); expect(getStatus).toHaveBeenCalledTimes(2);
  });
});

describe("unsupported detection-limit notation", () => {
  it.each([
    ["detectionLimit", "1e0"], ["detectionLimit", "invalid"],
    ["quantificationLimit", "1e0"], ["quantificationLimit", "invalid"],
  ] as const)("withholds an unsupported %s value %s without conversion", async (field, limit) => {
    const offer = fakeOffer(); offer.evidence[0].measurements[0][field] = limit;
    const before = structuredClone(offer);
    const result = await evaluate([offer]);
    expectUnranked(result, /limit.*unsupported|unsupported.*limit|limit.*numeric|limit.*decimal/i);
    expect(result.unrankable[0].best.reportedMeasurements[0][field]).toBe(limit);
    expect(offer).toEqual(before);
  });

  it("keeps absent limits absent while ranking an otherwise valid measured result", async () => {
    const offer = fakeOffer();
    offer.evidence[0].measurements[0].detectionLimit = null;
    offer.evidence[0].measurements[0].quantificationLimit = null;
    const result = await evaluate([offer]);
    expect(result.ranked).toHaveLength(1);
    expect(result.ranked[0].best.analytes[0]).toMatchObject({ value: "0.5", detectionLimit: null, quantificationLimit: null });
  });
});
