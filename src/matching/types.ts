import type { MatchEligibilityFacts } from "@/domain/commercial";
import type { MatchScope, MatchPolicy } from "./policy";
import type { Analyte } from "@/domain/types";

export type MatchRequirement = MatchScope & { id: string; buyerOrganizationId: string; quantity: number; quantityUnit: string };
export type EvidenceRecord = {
  visibility: "PUBLIC" | "GATED";
  id: string; reportVersion: string; payloadHash: string; tecridId: string;
  supplierId: string; lotId: string; sampleCode: string;
  historyStatus: "CURRENT" | "SUPERSEDED" | "CONFLICTING";
  bindingReviewedBy: string; bindingReference: string;
  collectedAt: string; reportedAt: string;
  measurements: {
    analyte: Analyte; species: string; value: string | null; unit: string;
    basis: string; matrix: string; method: string;
    qualifier: "MEASURED" | "NON_DETECT" | "CENSORED" | "LIMIT_ONLY";
    detectionLimit: string | null; quantificationLimit: string | null;
  }[];
};
export type MatchOffer = {
  id: string; supplierId: string; lotId: string;
  scope: MatchScope; eligibility: MatchEligibilityFacts;
  evidence: EvidenceRecord[];
};
export type MatchViewer = { userId: string; organizationId: string; visibility: "PUBLIC_ONLY" };
export interface GatedEvidenceAuthorization {
  canUse(viewer: MatchViewer, evidence: EvidenceRecord): Promise<boolean>;
}
export const denyGatedEvidence: GatedEvidenceAuthorization = { canUse: async () => false };
export type CertificationResult = { status: "unavailable" | "unverified" | "expired" | "revoked" | "out_of_scope" } | {
  status: "verified"; supplierId: string; productTypeId: string; profileVersionId: string;
  program: string; standardVersion: string; reference: string; validUntil: string; checkedAt: string;
};
export interface IcsCertificationVerifier {
  verify(offer: MatchOffer, at: string): Promise<CertificationResult>;
}
// No live ICS authority is wired in this build. Uploads never create a bonus.
export const unavailableIcsCertification: IcsCertificationVerifier = { verify: async () => ({ status: "unavailable" }) };
export type AnalyteExplanation = EvidenceRecord["measurements"][number] & {
  grade: string; utility: string; sourceTitle: string; edition: string; locator: string;
  regulatoryMapping: string; label: "VLE ranking policy";
  metadataVerification: "Reviewed report metadata; TECRID authenticates numeric results";
};
export type EvaluationReceipt = {
  engineVersion: "VLE_MATCH_CONTAMINATION_FIRST_V1";
  requirement: MatchRequirement; viewer: MatchViewer; evaluatedAt: string;
  policy: MatchPolicy | null;
  offer: { id: string; supplierId: string; lotId: string };
  eligibility: { [K in keyof MatchEligibilityFacts]: MatchEligibilityFacts[K] extends Date | null ? string | null : MatchEligibilityFacts[K] };
  outcome: "RANKED" | "UNRANKABLE" | "INELIGIBLE";
  reasons: string[]; reportedMeasurements: EvidenceRecord["measurements"]; analytes: AnalyteExplanation[];
  sources: { id: string; reportVersion: string; payloadHash: string; sampleCode: string; tecridId: string; issuer: string; contractVersion: string; issuedAt: string; verifiedAt: string; authenticationMethod: string; authenticationKeyId: string | null; checkedAt: string; statusContractVersion: string; statusAuthenticationMethod: string; statusAuthenticationKeyId: string | null; statusVerifiedAt: string; expiresAt: string; collectedAt: string; reportedAt: string; bindingReference: string; bindingReviewedBy: string }[];
  q: string | null; bonus: string | null;
  tecrid: { status: string; contribution: string | null };
  ics: { status: string; contribution: string | null; reference?: string; program?: string; standardVersion?: string; validUntil?: string; checkedAt?: string };
  tieBreak: string; rank: number | null;
};
export type SupplierMatchGroup = { supplierId: string; best: EvaluationReceipt; otherLots: EvaluationReceipt[] };
export type MatchEvaluation = { ranked: SupplierMatchGroup[]; unrankable: SupplierMatchGroup[]; excluded: EvaluationReceipt[] };
