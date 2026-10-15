import { sanitizeRequestContext, sanitizeOffer, sanitizePublicEvidence } from "./input";
import { isEligibleRequirementMatch } from "../domain/commercial";
import type { TecridAdapter } from "@/adapters/tecrid/types";
import { addDecimal, compareDecimal, loadMatchPolicy, type MatchScope } from "./policy";
import { denyGatedEvidence, unavailableIcsCertification, type CertificationResult, type EvaluationReceipt, type EvidenceRecord, type GatedEvidenceAuthorization, type IcsCertificationVerifier, type MatchEvaluation, type MatchOffer, type MatchRequirement, type MatchViewer, type SupplierMatchGroup } from "./types";

export { MATCH_METHODOLOGY_PATH, MATCH_TIE_COPY } from "./copy";
const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const sameScope = (a: MatchScope, b: MatchScope) => a.productCode === b.productCode && a.productTypeId === b.productTypeId && a.profileVersionId === b.profileVersionId && a.intendedUse === b.intendedUse && a.jurisdiction === b.jurisdiction;
const isDecimal = (value: unknown): value is string => typeof value === "string" && /^(0|[1-9]\d*)(\.\d+)?$/.test(value);
const mock = (value: string) => /mock/i.test(value);
const validPast = (value: string, at: number, age?: number) => Number.isFinite(Date.parse(value)) && Date.parse(value) <= at && (age === undefined || at - Date.parse(value) <= age);

const sameNumeric = (a: string | null, b: string | null) => a === null || b === null ? a === b : compareDecimal(a, b) === 0;
function evidenceFingerprint(evidence: EvidenceRecord) {
  return JSON.stringify({ ...evidence, id: "", measurements: [...evidence.measurements].sort((a, b) => lexical(JSON.stringify(a), JSON.stringify(b))) });
}
function sourceFingerprint(receipt: EvaluationReceipt) {
  return JSON.stringify({ sources: receipt.sources.map((source) => ({ ...source, id: "" })), analytes: receipt.analytes, reasons: receipt.reasons });
}
function freezeSnapshot<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeSnapshot);
    Object.freeze(value);
  }
  return value;
}

export function compareReceipts(a: EvaluationReceipt, b: EvaluationReceipt) {
  if (a.q !== null && b.q !== null) {
    const q = compareDecimal(b.q, a.q);
    if (q) return q;
    const bonus = compareDecimal(b.bonus!, a.bonus!);
    if (bonus) return bonus;
  } else if (a.q !== null || b.q !== null) return a.q !== null ? -1 : 1;
  return lexical(a.offer.supplierId, b.offer.supplierId) || lexical(a.offer.lotId, b.offer.lotId) || lexical(a.offer.id, b.offer.id);
}

/** A fresh request-local snapshot. Never persist it as listing eligibility or share-cache it. */
export async function evaluateMatches(input: {
  requirement: MatchRequirement; viewer: MatchViewer; offers: MatchOffer[]; config?: unknown; now: Date;
}, dependencies: {
  tecrid: TecridAdapter;
  ics?: IcsCertificationVerifier;
  authorization?: GatedEvidenceAuthorization;
}): Promise<MatchEvaluation> {
  const snapshot = structuredClone(input);
  const { requirement, viewer } = sanitizeRequestContext(snapshot);
  const { offers, config, now } = snapshot;
  const at = now.getTime();
  if (!Number.isFinite(at)) throw new Error("Invalid evaluation time");
  if (!viewer.userId || viewer.visibility !== "PUBLIC_ONLY" || viewer.organizationId !== requirement.buyerOrganizationId) throw new Error("Comparison access denied");
  const loaded = loadMatchPolicy(config);
  const policy = loaded.enabled ? loaded.policy : null;
  const authorization = dependencies.authorization ?? denyGatedEvidence;
  const ics = dependencies.ics ?? unavailableIcsCertification;
  const evaluated: EvaluationReceipt[] = [];
  // Repeated references use one current verification snapshot within this request.
  // Every new evaluation performs fresh status checks; nothing is shared or cached globally.
  const verificationSnapshots = new Map<string, Promise<[Awaited<ReturnType<TecridAdapter["verify"]>>, Awaited<ReturnType<TecridAdapter["getStatus"]>>]>>();

  for (const candidate of offers) {
    const offer: MatchOffer = { ...sanitizeOffer(candidate), evidence: [] };
    const receipt: EvaluationReceipt = {
      engineVersion: "VLE_MATCH_CONTAMINATION_FIRST_V1", requirement, viewer, evaluatedAt: now.toISOString(), policy,
      offer: { id: offer.id, supplierId: offer.supplierId, lotId: offer.lotId },
      eligibility: Object.fromEntries(Object.entries(offer.eligibility).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value])) as EvaluationReceipt["eligibility"],
      outcome: "UNRANKABLE", reasons: [], reportedMeasurements: [], analytes: [], sources: [], q: null, bonus: null,
      tecrid: { status: "unavailable", contribution: null }, ics: { status: "unavailable", contribution: null },
      tieBreak: "No ordinal rank", rank: null,
    };
    evaluated.push(receipt);
    const reject = (reason: string) => { receipt.reasons.push(reason); };
    if (!offer.id.trim() || !offer.supplierId.trim() || !offer.lotId.trim() ||
      !Number.isFinite(offer.eligibility.availableQuantity) || offer.eligibility.availableQuantity <= 0 ||
      offer.eligibility.requirementQuantity !== requirement.quantity ||
      offer.eligibility.requirementQuantityUnit !== requirement.quantityUnit ||
      offer.eligibility.requirementProductCode !== requirement.productCode ||
      !isEligibleRequirementMatch(offer.eligibility, now) ||
      offer.eligibility.requirementProductTypeId !== requirement.productTypeId ||
      offer.eligibility.requirementProfileVersionId !== requirement.profileVersionId ||
      requirement.productCode !== "COCOA_POWDER") {
      receipt.outcome = "INELIGIBLE"; reject("Existing listing or requirement eligibility gate failed"); continue;
    }
    if (!policy) { reject("No approved grade mapping"); continue; }
    if (!sameScope(requirement, policy.MATCH_SCOPE) || !sameScope(requirement, offer.scope)) { reject("Category, profile, intended use or jurisdiction mismatch"); continue; }
    if (Date.parse(policy.MATCH_POLICY_VERSION.effectiveAt) > at) { reject("Ranking policy is not yet effective"); continue; }

    // Even an affirmative future grant cannot authorize public derived disclosure.
    // No receipt includes a gated identifier, filename, count or reason.
    const publicEvidence: EvidenceRecord[] = [];
    for (const evidence of candidate.evidence) {
      if (evidence.visibility === "GATED") {
        await authorization.canUse(structuredClone(viewer), structuredClone(evidence)).catch(() => false);
        continue;
      }
      if (evidence.visibility === "PUBLIC") {
        const safeEvidence = sanitizePublicEvidence(evidence);
        if (safeEvidence) publicEvidence.push(safeEvidence);
        else reject("Public evidence structure is invalid");
      }
    }
    offer.evidence = publicEvidence;
    const records = new Map<string, EvidenceRecord>();
    for (const evidence of publicEvidence) {
      if (evidence.historyStatus === "SUPERSEDED") continue;
      if (evidence.historyStatus !== "CURRENT") { reject("Conflicting authoritative evidence history"); continue; }
      const key = JSON.stringify([evidence.tecridId, evidence.sampleCode, evidence.reportVersion]);
      const prior = records.get(key);
      if (prior && evidenceFingerprint(prior) !== evidenceFingerprint(evidence)) reject("Conflicting copies of authenticated evidence");
      else if (!prior || lexical(evidence.id, prior.id) < 0) records.set(key, evidence);
    }
    if (!records.size) reject("Authorized evidence unavailable");
    // Current adapter cannot resolve competing current samples/report versions.
    if (records.size > 1) reject("Conflicting current evidence requires authoritative resolution");
    if (receipt.reasons.length) continue;
    const evidence = [...records.values()][0];
    if (!evidence.id || !evidence.reportVersion || !evidence.payloadHash || !evidence.sampleCode ||
      evidence.supplierId !== offer.supplierId || evidence.lotId !== offer.lotId ||
      !evidence.bindingReviewedBy || !evidence.bindingReference) { reject("Supplier, sample or physical-lot binding is unverified"); continue; }
    const freshness = policy.MATCH_VERIFICATION_FRESHNESS_POLICY;
    if (!validPast(evidence.collectedAt, at, freshness.maxAgeMs) || !validPast(evidence.reportedAt, at, freshness.maxAgeMs) || Date.parse(evidence.collectedAt) > Date.parse(evidence.reportedAt)) { reject("Collection or report dates are stale or invalid"); continue; }
    receipt.reportedMeasurements = structuredClone(evidence.measurements);
    if (evidence.measurements.some((m) => m.qualifier !== "MEASURED" || m.value === null)) { reject("Censored, non-detect or detection-limit-only evidence is not rankable"); continue; }
    try {
      const verificationKey = JSON.stringify([evidence.tecridId, evidence.sampleCode, evidence.payloadHash, evidence.reportVersion]);
      let verification = verificationSnapshots.get(verificationKey);
      if (!verification) {
        verification = Promise.all([
          dependencies.tecrid.verify({ tecridId: evidence.tecridId, expectedSampleCode: evidence.sampleCode }),
          dependencies.tecrid.getStatus(evidence.tecridId),
        ]);
        verificationSnapshots.set(verificationKey, verification);
      }
      const [verified, status] = await verification;
      const identities = [verified.contractVersion, verified.issuer, verified.authentication.method, status.contractVersion, status.authentication.method];
      if (identities.some(mock)) { receipt.tecrid.status = "mock refused"; reject("Mock receipts cannot verify ranking evidence"); continue; }
      if (verified.tecridId !== evidence.tecridId || status.tecridId !== evidence.tecridId || verified.sampleCode !== evidence.sampleCode || verified.payloadHash !== evidence.payloadHash) { reject("TECRID sample or evidence hash binding mismatch"); continue; }
      if (verified.status !== "CURRENT" || status.status !== "CURRENT" || status.revokedAt || status.revocationReason) { receipt.tecrid.status = "revoked"; reject("TECRID evidence is revoked or not current"); continue; }
      if (verified.contractVersion !== status.contractVersion || !freshness.contractVersions.includes(verified.contractVersion) || !freshness.contractVersions.includes(status.contractVersion) || !freshness.issuers.includes(verified.issuer) ||
        !freshness.authenticationMethods.includes(verified.authentication.method) || !freshness.authenticationMethods.includes(status.authentication.method) ||
        verified.authentication.status !== "VERIFIED" || status.authentication.status !== "VERIFIED") { receipt.tecrid.status = "unverified"; reject("TECRID authority or authentication is unapproved"); continue; }
      if (!(Date.parse(verified.expiresAt) > at) || !validPast(verified.issuedAt, at, freshness.maxAgeMs) ||
        Date.parse(verified.issuedAt) > Date.parse(verified.authentication.verifiedAt) ||
        Date.parse(verified.issuedAt) > Date.parse(status.checkedAt) ||
        Date.parse(evidence.reportedAt) > Date.parse(verified.issuedAt) ||
        !validPast(status.checkedAt, at, freshness.maxAgeMs) || !validPast(verified.authentication.verifiedAt, at, freshness.maxAgeMs) || !validPast(status.authentication.verifiedAt, at, freshness.maxAgeMs)) { receipt.tecrid.status = "stale or expired"; reject("TECRID evidence or freshness check is expired, stale or invalid"); continue; }
      receipt.tecrid = { status: "verified and current", contribution: policy.MATCH_WEIGHT_TECRID };
      for (const analyte of policy.MATCH_REQUIRED_ANALYTES) {
        const mapping = policy.MATCH_STANDARD_MAPPING.find((m) => m.analyte === analyte)!;
        const measurements = evidence.measurements.filter((m) => m.analyte === analyte);
        const authenticated = verified.results.filter((m) => m.analyte === analyte);
        if (measurements.length !== 1 || authenticated.length !== 1) { reject(`Missing or conflicting panel result: ${analyte}`); continue; }
        const m = measurements[0]; const raw = authenticated[0];
        if (!isDecimal(m.value) || !Number.isFinite(raw.valuePpm) || !isDecimal(String(raw.valuePpm)) || compareDecimal(m.value, String(raw.valuePpm)) !== 0 || m.unit !== raw.unit) { reject(`Unverified measured result: ${analyte}`); continue; }
        if ([m.detectionLimit, m.quantificationLimit].some((limit) => limit !== null && !isDecimal(limit))) { reject(`Unsupported detection or quantification limit: ${analyte}`); continue; }
        if ([m.detectionLimit, m.quantificationLimit].some((limit) => isDecimal(limit) && compareDecimal(m.value!, limit) < 0)) { reject(`Measured value is below a supplied detection or quantification limit: ${analyte}`); continue; }
        if (m.unit !== mapping.unit || m.species !== mapping.species || m.basis !== mapping.basis || m.matrix !== mapping.matrix || m.method !== mapping.method) { reject(`Incomparable species, unit, basis, matrix or method: ${analyte}`); continue; }
        if (Date.parse(mapping.effectiveAt) > at || Date.parse(mapping.retrievedAt) > at) { reject(`Source edition is not applicable: ${analyte}`); continue; }
        const grade = mapping.grades.find((g) => compareDecimal(m.value!, g.maxValue) <= 0);
        if (!grade) { reject(`No approved grade mapping: ${analyte}`); continue; }
        receipt.analytes.push({ ...m, grade: grade.grade, utility: policy.MATCH_GRADE_UTILITY[grade.grade], sourceTitle: mapping.sourceTitle, edition: mapping.edition, locator: mapping.locator, regulatoryMapping: mapping.regulatoryMapping, label: mapping.label, metadataVerification: "Reviewed report metadata; TECRID authenticates numeric results" });
      }
      receipt.sources.push({ id: evidence.id, reportVersion: evidence.reportVersion, payloadHash: evidence.payloadHash, sampleCode: evidence.sampleCode, tecridId: evidence.tecridId, issuer: verified.issuer, contractVersion: verified.contractVersion, issuedAt: verified.issuedAt, verifiedAt: verified.authentication.verifiedAt, authenticationMethod: verified.authentication.method, authenticationKeyId: verified.authentication.keyId, checkedAt: status.checkedAt, statusContractVersion: status.contractVersion, statusAuthenticationMethod: status.authentication.method, statusAuthenticationKeyId: status.authentication.keyId, statusVerifiedAt: status.authentication.verifiedAt, expiresAt: verified.expiresAt, collectedAt: evidence.collectedAt, reportedAt: evidence.reportedAt, bindingReference: evidence.bindingReference, bindingReviewedBy: evidence.bindingReviewedBy });
    } catch {
      receipt.tecrid.status = "unavailable"; reject("TECRID verification unavailable");
    }
    if (receipt.reasons.length) { receipt.tecrid.contribution = null; continue; }
    let cert: CertificationResult;
    try { cert = await ics.verify(structuredClone(offer), receipt.evaluatedAt); } catch { cert = { status: "unavailable" as const }; }
    if (!cert || !["verified", "unavailable", "unverified", "expired", "revoked", "out_of_scope"].includes(cert.status)) cert = { status: "unverified" };
    receipt.ics = { status: cert.status, contribution: "0" };
    if (cert.status === "verified") {
      if (cert.supplierId !== offer.supplierId || cert.productTypeId !== requirement.productTypeId || cert.profileVersionId !== requirement.profileVersionId || cert.program !== policy.MATCH_ICS_CERTIFICATION_SCOPE.program || cert.standardVersion !== policy.MATCH_ICS_CERTIFICATION_SCOPE.standardVersion || !cert.reference) receipt.ics.status = "out_of_scope";
      else if (!(Date.parse(cert.validUntil) > at) || !validPast(cert.checkedAt, at, freshness.maxAgeMs)) receipt.ics.status = "expired";
      else receipt.ics = { status: "verified", contribution: policy.MATCH_WEIGHT_ICS_CERT, reference: cert.reference, program: cert.program, standardVersion: cert.standardVersion, validUntil: cert.validUntil, checkedAt: cert.checkedAt };
    }
    receipt.q = receipt.analytes.map((a) => a.utility).reduce((a, b) => compareDecimal(a, b) < 0 ? a : b);
    receipt.bonus = addDecimal(receipt.tecrid.contribution!, receipt.ics.contribution!);
    receipt.outcome = "RANKED";
    receipt.tieBreak = "Contamination utility descending; equal utility uses bonus sum descending; remaining ties use supplier, physical-lot and offer IDs ascending";
  }
  // A repeated listing cannot multiply a supplier or physical-lot result.
  const lots = new Map<string, EvaluationReceipt>();
  for (const receipt of evaluated.filter((r) => r.outcome !== "INELIGIBLE").sort(compareReceipts)) {
    const key = JSON.stringify([receipt.offer.supplierId, receipt.offer.lotId]);
    const prior = lots.get(key);
    if (!prior) lots.set(key, receipt);
    else if (prior.outcome !== receipt.outcome || !sameNumeric(prior.q, receipt.q) || !sameNumeric(prior.bonus, receipt.bonus) || sourceFingerprint(prior) !== sourceFingerprint(receipt)) {
      prior.outcome = "UNRANKABLE"; prior.q = null; prior.bonus = null;
      prior.tecrid.contribution = null; prior.ics.contribution = null;
      prior.reasons = ["Conflicting offers for the same physical lot"];
    }
  }
  const suppliers = new Map<string, SupplierMatchGroup>();
  for (const receipt of [...lots.values()].sort(compareReceipts)) {
    const prior = suppliers.get(receipt.offer.supplierId);
    if (prior) prior.otherLots.push(receipt);
    else suppliers.set(receipt.offer.supplierId, { supplierId: receipt.offer.supplierId, best: receipt, otherLots: [] });
  }
  const ranked = [...suppliers.values()].filter((g) => g.best.outcome === "RANKED").sort((a, b) => compareReceipts(a.best, b.best));
  ranked.forEach((group, index) => {
    const previous = ranked[index - 1]?.best;
    group.best.rank = previous && compareDecimal(previous.q!, group.best.q!) === 0 && compareDecimal(previous.bonus!, group.best.bonus!) === 0 ? previous.rank : index + 1;
  });
  return freezeSnapshot({ ranked, unrankable: [...suppliers.values()].filter((g) => g.best.outcome !== "RANKED").sort((a, b) => compareReceipts(a.best, b.best)), excluded: evaluated.filter((r) => r.outcome === "INELIGIBLE") });
}
