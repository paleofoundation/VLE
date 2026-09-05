import type { LotPublicationFacts } from "./types";

export type PublicationGate = { allowed: true } | { allowed: false; reasons: readonly string[] };

export function evaluatePublicationGate(facts: LotPublicationFacts, now: Date): PublicationGate {
  const reasons: string[] = [];
  if (!facts.identityConfirmedAt) reasons.push("Physical lot identity is not confirmed");
  if (!facts.quantityVerifiedAt) reasons.push("Quantity is not verified");
  if (!facts.locationVerifiedAt) reasons.push("Location is not verified");
  if (!facts.authorityToSellVerifiedAt) reasons.push("Authority to sell is not verified");
  if (!facts.samplingRecorded) reasons.push("Sampling record is missing");
  if (facts.evidenceStatus !== "CURRENT") reasons.push("TECRID-linked evidence is not current");
  if (!facts.evidenceExpiresAt || facts.evidenceExpiresAt <= now) reasons.push("Evidence is expired");
  if (facts.decisionOutcome !== "QUALIFIED") reasons.push("Latest decision is not QUALIFIED");
  if (!facts.profileFrozen) reasons.push("Compliance profile version is not frozen");
  if (facts.heldAt) reasons.push("Lot is on hold");
  if (facts.revokedAt) reasons.push("Lot is revoked");
  if (facts.transformedAt) reasons.push("Lot has been transformed");
  if (facts.depletedAt) reasons.push("Lot is depleted");
  return reasons.length ? { allowed: false, reasons } : { allowed: true };
}

export function shouldAutomaticallyUnlist(
  facts: Pick<LotPublicationFacts, "evidenceStatus" | "evidenceExpiresAt" | "heldAt" | "revokedAt" | "transformedAt" | "depletedAt">,
  now: Date,
) {
  return (
    facts.evidenceStatus !== "CURRENT" ||
    !facts.evidenceExpiresAt ||
    facts.evidenceExpiresAt <= now ||
    Boolean(facts.heldAt || facts.revokedAt || facts.transformedAt || facts.depletedAt)
  );
}
