export const roles = ["BUYER", "SUPPLIER", "OPS", "ADMIN"] as const;
export type Role = (typeof roles)[number];

export const lotStatuses = [
  "NOMINATED",
  "SAMPLING",
  "EVIDENCE_RECEIVED",
  "QUALIFIED",
  "NOT_QUALIFIED",
  "INSUFFICIENT_EVIDENCE",
  "HELD",
  "REVOKED",
  "TRANSFORMED",
  "DEPLETED",
] as const;
export type LotStatus = (typeof lotStatuses)[number];

export const samplingStatuses = [
  "REQUESTED",
  "SCHEDULED",
  "COLLECTED",
  "SHIPPED",
  "RECEIVED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type SamplingStatus = (typeof samplingStatuses)[number];

export const qualificationOutcomes = [
  "QUALIFIED",
  "NOT_QUALIFIED",
  "INSUFFICIENT_EVIDENCE",
] as const;
export type QualificationOutcome = (typeof qualificationOutcomes)[number];

export type Analyte = "lead" | "cadmium" | "arsenic" | "mercury";
export type LimitRule = { analyte: Analyte; maxPpm: number };
export type ResultValue = { analyte: Analyte; valuePpm: number; unit: "ppm" };

export type FrozenProfile = {
  id: string;
  version: string;
  status: "FROZEN";
  rules: readonly LimitRule[];
};

export type EvidenceInput = {
  id: string;
  status: "CURRENT" | "REVOKED";
  issuedAt: Date;
  expiresAt: Date;
  results: readonly ResultValue[];
};

export type LotPublicationFacts = {
  identityConfirmedAt: Date | null;
  quantityVerifiedAt: Date | null;
  locationVerifiedAt: Date | null;
  authorityToSellVerifiedAt: Date | null;
  samplingRecorded: boolean;
  evidenceStatus: "CURRENT" | "REVOKED" | null;
  evidenceExpiresAt: Date | null;
  decisionOutcome: QualificationOutcome | null;
  profileFrozen: boolean;
  heldAt: Date | null;
  revokedAt: Date | null;
  transformedAt: Date | null;
  depletedAt: Date | null;
};
