import { z } from "zod";
import { matchScopeSchema } from "./policy";
import type { EvidenceRecord, MatchOffer, MatchRequirement, MatchViewer } from "./types";

// Strip unknown fields before any evaluation snapshot is created. In particular,
// arbitrary attachment URLs and metadata must not ride along in an explanation.
const text = z.string();
const timestamp = z.string();
const scope = z.object({ ...matchScopeSchema.shape, productCode: text });
const measurement = z.object({
  analyte: z.enum(["lead", "cadmium", "arsenic", "mercury"]), species: text,
  value: text.nullable(), unit: text, basis: text, matrix: text, method: text,
  qualifier: z.enum(["MEASURED", "NON_DETECT", "CENSORED", "LIMIT_ONLY"]),
  detectionLimit: text.nullable(), quantificationLimit: text.nullable(),
});
const evidence = z.object({
  visibility: z.literal("PUBLIC"), id: text, reportVersion: text, payloadHash: text,
  tecridId: text, supplierId: text, lotId: text, sampleCode: text,
  historyStatus: z.enum(["CURRENT", "SUPERSEDED", "CONFLICTING"]),
  bindingReviewedBy: text, bindingReference: text, collectedAt: timestamp,
  reportedAt: timestamp, measurements: z.array(measurement),
});
const date = z.date();
const eligibility = z.object({
  requirementProductCode: text, requirementProductTypeId: text,
  requirementProfileVersionId: text, requirementQuantity: z.number(),
  requirementQuantityUnit: text, listingStatus: z.enum(["LISTED", "UNLISTED"]),
  listingProductTypeId: text, listingProfileVersionId: text,
  availableQuantity: z.number(), availableQuantityUnit: text,
  decisionOutcome: z.enum(["QUALIFIED", "NOT_QUALIFIED", "INSUFFICIENT_EVIDENCE"]),
  profileStatus: z.enum(["DRAFT", "FROZEN", "RETIRED"]),
  evidenceStatus: z.enum(["CURRENT", "REVOKED"]), evidenceExpiresAt: date,
  identityConfirmedAt: date.nullable(), quantityVerifiedAt: date.nullable(),
  locationVerifiedAt: date.nullable(), authorityToSellVerifiedAt: date.nullable(),
  heldAt: date.nullable(), revokedAt: date.nullable(), transformedAt: date.nullable(),
  depletedAt: date.nullable(),
});
const offer = z.object({ id: text, supplierId: text, lotId: text, scope, eligibility });
const requirement = z.object({ ...scope.shape, id: text.min(1), buyerOrganizationId: text.min(1), quantity: z.number().positive(), quantityUnit: text.min(1) });
const viewer = z.object({ userId: text.min(1), organizationId: text.min(1), visibility: z.literal("PUBLIC_ONLY") });

export function sanitizeRequestContext(input: { requirement: MatchRequirement; viewer: MatchViewer }) {
  const parsed = z.object({ requirement, viewer }).safeParse(input);
  if (!parsed.success) throw new Error("Invalid comparison context");
  return parsed.data as { requirement: MatchRequirement; viewer: MatchViewer };
}
export function sanitizeOffer(input: MatchOffer): Omit<MatchOffer, "evidence"> {
  const parsed = offer.safeParse(input);
  if (!parsed.success) throw new Error("Invalid offered-lot context");
  return parsed.data as Omit<MatchOffer, "evidence">;
}
export function sanitizePublicEvidence(input: EvidenceRecord): EvidenceRecord | null {
  const parsed = evidence.safeParse(input);
  return parsed.success ? parsed.data : null;
}
