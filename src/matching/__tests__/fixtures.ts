import type { TecridAdapter, TecridEvidenceEnvelope, TecridEvidenceStatusEnvelope } from "../../adapters/tecrid/types";
import type { MatchPolicy } from "../policy";
import type { CertificationResult, MatchOffer, MatchRequirement, MatchViewer } from "../types";

// TEST-ONLY FAKE data. These invented values and identities have no scientific,
// regulatory, production-configuration or real supplier meaning.
export const FAKE_NOW = new Date("2035-01-02T12:00:00.000Z");
export const FAKE_RECENT = "2035-01-02T11:59:00.000Z";
export const FAKE_FUTURE = "2035-01-03T12:00:00.000Z";
export const FAKE_SCOPE = {
  productCode: "COCOA_POWDER" as const,
  productTypeId: "FAKE_COCOA", profileVersionId: "FAKE_PROFILE_1",
  intendedUse: "FAKE_TEST_USE", jurisdiction: "FAKE_TEST_JURISDICTION",
};
export const FAKE_REQUIREMENT: MatchRequirement = { ...FAKE_SCOPE, id: "FAKE_REQUIREMENT", buyerOrganizationId: "FAKE_BUYER", quantity: 10, quantityUnit: "FAKE_QUANTITY_UNIT" };
export const FAKE_VIEWER: MatchViewer = { userId: "FAKE_USER", organizationId: "FAKE_BUYER", visibility: "PUBLIC_ONLY" };

export function fakePolicy(): MatchPolicy {
  return {
    MATCH_POLICY_VERSION: { id: "FAKE_POLICY_1", effectiveAt: "2035-01-01T00:00:00.000Z", approvedBy: "FAKE_REVIEWER" },
    MATCH_SCOPE: { ...FAKE_SCOPE },
    MATCH_REQUIRED_ANALYTES: ["lead", "cadmium"],
    MATCH_STANDARD_MAPPING: (["lead", "cadmium"] as const).map((analyte) => ({
      analyte, species: `FAKE_${analyte}_SPECIES`, unit: "ppm" as const,
      basis: "FAKE_BASIS", matrix: "FAKE_MATRIX", method: "FAKE_METHOD",
      sourceTitle: "TEST-ONLY FAKE grade mapping", authority: "FAKE_AUTHORITY",
      edition: "FAKE_EDITION", effectiveAt: "2035-01-01T00:00:00.000Z",
      retrievedAt: "2035-01-01T00:00:00.000Z", locator: "FAKE_TABLE", reviewer: "FAKE_REVIEWER",
      regulatoryMapping: "NO_REGULATORY_LIMIT_MAPPED" as const, label: "VLE ranking policy" as const,
      grades: [{ grade: "FAKE_A", maxValue: "1" }, { grade: "FAKE_B", maxValue: "10" }],
    })),
    MATCH_GRADE_UTILITY: { FAKE_A: "100.10", FAKE_B: "100.01" },
    MATCH_WEIGHT_TECRID: "2.50", MATCH_WEIGHT_ICS_CERT: "10000.25",
    MATCH_ICS_CERTIFICATION_SCOPE: { program: "FAKE_CERT_PROGRAM", standardVersion: "FAKE_CERT_STANDARD" },
    MATCH_VERIFICATION_FRESHNESS_POLICY: {
      id: "FAKE_FRESHNESS", maxAgeMs: 86_400_000,
      contractVersions: ["FAKE_CONTRACT_V1"], issuers: ["FAKE_ISSUER"], authenticationMethods: ["FAKE_AUTHENTICATION"],
    },
    MATCH_CENSORING_POLICY: "REJECT_CENSORED",
    MATCH_NUMERIC_POLICY: { id: "FAKE_DECIMAL_POLICY", representation: "EXACT_DECIMAL_STRING", display: "UNROUNDED", comparableUtilitiesApproved: true },
  };
}

export function fakeOffer(supplierId = "FAKE_SUPPLIER_A", lotId = "FAKE_LOT_A", values: [string, string] = ["0.5", "0.5"]): MatchOffer {
  const identity = `${supplierId}_${lotId}`;
  return {
    id: `FAKE_OFFER_${identity}`, supplierId, lotId, scope: { ...FAKE_SCOPE },
    eligibility: {
      requirementProductCode: "COCOA_POWDER", requirementProductTypeId: FAKE_SCOPE.productTypeId,
      requirementProfileVersionId: FAKE_SCOPE.profileVersionId, requirementQuantity: 10, requirementQuantityUnit: "FAKE_QUANTITY_UNIT",
      listingStatus: "LISTED", listingProductTypeId: FAKE_SCOPE.productTypeId, listingProfileVersionId: FAKE_SCOPE.profileVersionId,
      availableQuantity: 20, availableQuantityUnit: "FAKE_QUANTITY_UNIT", decisionOutcome: "QUALIFIED", profileStatus: "FROZEN",
      evidenceStatus: "CURRENT", evidenceExpiresAt: new Date(FAKE_FUTURE), identityConfirmedAt: new Date(FAKE_RECENT),
      quantityVerifiedAt: new Date(FAKE_RECENT), locationVerifiedAt: new Date(FAKE_RECENT), authorityToSellVerifiedAt: new Date(FAKE_RECENT),
      heldAt: null, revokedAt: null, transformedAt: null, depletedAt: null,
    },
    evidence: [{
      visibility: "PUBLIC", id: `FAKE_EVIDENCE_${identity}`, reportVersion: "FAKE_REPORT_V1", payloadHash: `FAKE_HASH_${identity}`,
      tecridId: `FAKE_TECRID_${identity}`, supplierId, lotId, sampleCode: `FAKE_SAMPLE_${identity}`, historyStatus: "CURRENT",
      bindingReviewedBy: "FAKE_BINDING_REVIEWER", bindingReference: "FAKE_BINDING_RECEIPT",
      collectedAt: "2035-01-02T11:00:00.000Z", reportedAt: "2035-01-02T11:30:00.000Z",
      measurements: (["lead", "cadmium"] as const).map((analyte, index) => ({
        analyte, species: `FAKE_${analyte}_SPECIES`, value: values[index], unit: "ppm", basis: "FAKE_BASIS",
        matrix: "FAKE_MATRIX", method: "FAKE_METHOD", qualifier: "MEASURED", detectionLimit: "0.01", quantificationLimit: "0.1",
      })),
    }],
  };
}

export function fakeAdapter(offers: MatchOffer[]) {
  const envelopes = new Map<string, TecridEvidenceEnvelope>();
  const statuses = new Map<string, TecridEvidenceStatusEnvelope>();
  for (const evidence of offers.flatMap((offer) => offer.evidence)) {
    envelopes.set(evidence.tecridId, {
      contractVersion: "FAKE_CONTRACT_V1", tecridId: evidence.tecridId, sampleCode: evidence.sampleCode,
      issuer: "FAKE_ISSUER", status: "CURRENT", issuedAt: FAKE_RECENT, expiresAt: FAKE_FUTURE,
      results: evidence.measurements.map((m) => ({ analyte: m.analyte, valuePpm: Number(m.value), unit: "ppm" })),
      payloadHash: evidence.payloadHash,
      authentication: { status: "VERIFIED", method: "FAKE_AUTHENTICATION", keyId: "FAKE_KEY", verifiedAt: FAKE_RECENT },
    });
    statuses.set(evidence.tecridId, {
      contractVersion: "FAKE_CONTRACT_V1", tecridId: evidence.tecridId, status: "CURRENT", checkedAt: FAKE_RECENT,
      revokedAt: null, revocationReason: null,
      authentication: { status: "VERIFIED", method: "FAKE_AUTHENTICATION", keyId: "FAKE_KEY", verifiedAt: FAKE_RECENT },
    });
  }
  const adapter: TecridAdapter = {
    async verify(request) {
      const envelope = envelopes.get(request.tecridId);
      if (!envelope) throw new Error("FAKE missing receipt");
      return structuredClone(envelope);
    },
    async getStatus(tecridId) {
      const status = statuses.get(tecridId);
      if (!status) throw new Error("FAKE missing status");
      return structuredClone(status);
    },
  };
  return { adapter, envelopes, statuses };
}

export function fakeCertificate(offer: MatchOffer): Extract<CertificationResult, { status: "verified" }> {
  return {
    status: "verified", supplierId: offer.supplierId, productTypeId: FAKE_SCOPE.productTypeId, profileVersionId: FAKE_SCOPE.profileVersionId,
    program: "FAKE_CERT_PROGRAM", standardVersion: "FAKE_CERT_STANDARD", reference: "FAKE_CERT_RECEIPT",
    validUntil: FAKE_FUTURE, checkedAt: FAKE_RECENT,
  };
}
