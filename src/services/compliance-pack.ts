import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  auditEvents,
  complianceProfiles,
  complianceProfileVersions,
  lotArtifacts,
  marketplaceListings,
  organizations,
  physicalLots,
  productTypes,
  qualificationDecisions,
  samples,
  samplingOrders,
  tecridEvidence,
} from "@/db/schema";
import { assertPermission, assertTenant, type Actor } from "@/domain/authz";
import { addCompliancePackChecksum, COMPLIANCE_PACK_FORMAT, COMPLIANCE_PACK_VERSION } from "@/domain/compliance-pack";
import { DomainError } from "@/domain/errors";
import { evaluatePublicationGate } from "@/domain/publication";

export async function exportLotCompliancePack(actor: Actor, lotId: string, generatedAt = new Date()) {
  assertPermission(actor, "EXPORT_COMPLIANCE_PACK");
  const db = getDb();
  const [header] = await db.select({
    lot: physicalLots,
    supplierName: organizations.name,
    supplierSlug: organizations.slug,
    productName: productTypes.name,
    productCode: productTypes.code,
  }).from(physicalLots)
    .innerJoin(organizations, eq(organizations.id, physicalLots.supplierOrganizationId))
    .innerJoin(productTypes, eq(productTypes.id, physicalLots.productTypeId))
    .where(eq(physicalLots.id, lotId)).limit(1);
  if (!header) throw new DomainError("Physical lot not found", "NOT_FOUND");
  assertTenant(actor, header.lot.supplierOrganizationId);

  const [orders, lotSamples, decisions, listings, artifacts] = await Promise.all([
    db.select().from(samplingOrders).where(eq(samplingOrders.physicalLotId, lotId)).orderBy(asc(samplingOrders.createdAt)),
    db.select().from(samples).where(eq(samples.physicalLotId, lotId)).orderBy(asc(samples.createdAt)),
    db.select({
      decision: qualificationDecisions,
      profile: {
        id: complianceProfiles.id,
        name: complianceProfiles.name,
      },
      profileVersion: {
        id: complianceProfileVersions.id,
        version: complianceProfileVersions.version,
        status: complianceProfileVersions.status,
        rules: complianceProfileVersions.rules,
        notes: complianceProfileVersions.notes,
        frozenAt: complianceProfileVersions.frozenAt,
      },
    }).from(qualificationDecisions)
      .innerJoin(complianceProfileVersions, eq(complianceProfileVersions.id, qualificationDecisions.profileVersionId))
      .innerJoin(complianceProfiles, eq(complianceProfiles.id, complianceProfileVersions.profileId))
      .where(eq(qualificationDecisions.physicalLotId, lotId)).orderBy(asc(qualificationDecisions.decidedAt)),
    db.select().from(marketplaceListings).where(eq(marketplaceListings.physicalLotId, lotId)).orderBy(asc(marketplaceListings.publishedAt)),
    db.select({
      id: lotArtifacts.id,
      artifactType: lotArtifacts.artifactType,
      fileName: lotArtifacts.fileName,
      referenceUrl: lotArtifacts.referenceUrl,
      documentDate: lotArtifacts.documentDate,
      notes: lotArtifacts.notes,
      receivedAt: lotArtifacts.receivedAt,
      createdAt: lotArtifacts.createdAt,
    }).from(lotArtifacts).where(eq(lotArtifacts.physicalLotId, lotId)).orderBy(asc(lotArtifacts.receivedAt)),
  ]);
  const evidence = lotSamples.length
    ? await db.select().from(tecridEvidence).where(inArray(tecridEvidence.sampleId, lotSamples.map((sample) => sample.id))).orderBy(asc(tecridEvidence.createdAt))
    : [];

  const relatedEntityIds = [
    lotId,
    ...orders.map(({ id }) => id),
    ...lotSamples.map(({ id }) => id),
    ...evidence.map(({ id }) => id),
    ...decisions.flatMap(({ decision, profileVersion }) => [decision.id, profileVersion.id]),
    ...listings.map(({ id }) => id),
    ...artifacts.map(({ id }) => id),
  ];
  const auditTrail = await db.select().from(auditEvents)
    .where(inArray(auditEvents.entityId, relatedEntityIds)).orderBy(asc(auditEvents.createdAt));

  const latestDecision = decisions.at(-1);
  const decisionEvidence = latestDecision ? evidence.find((item) => item.id === latestDecision.decision.evidenceId) : undefined;
  const gate = latestDecision
    ? evaluatePublicationGate({
      identityConfirmedAt: header.lot.identityConfirmedAt,
      quantityVerifiedAt: header.lot.quantityVerifiedAt,
      locationVerifiedAt: header.lot.locationVerifiedAt,
      authorityToSellVerifiedAt: header.lot.authorityToSellVerifiedAt,
      samplingRecorded: lotSamples.some((sample) => sample.id === latestDecision.decision.sampleId),
      evidenceStatus: decisionEvidence?.status ?? null,
      evidenceExpiresAt: decisionEvidence?.expiresAt ?? null,
      decisionOutcome: latestDecision.decision.outcome,
      profileFrozen: latestDecision.profileVersion.status === "FROZEN",
      heldAt: header.lot.heldAt,
      revokedAt: header.lot.revokedAt,
      transformedAt: header.lot.transformedAt,
      depletedAt: header.lot.depletedAt,
    }, generatedAt)
    : { allowed: false as const, reasons: ["No QualificationDecision exists for this physical lot"] };
  const listedAtExport = listings.some((listing) => listing.status === "LISTED");
  const permittedClaimAtExport = gate.allowed && latestDecision
    ? `Passed ${latestDecision.profile.name} v${latestDecision.profileVersion.version}`
    : null;

  const payload = {
    format: COMPLIANCE_PACK_FORMAT,
    formatVersion: COMPLIANCE_PACK_VERSION,
    generatedAt: generatedAt.toISOString(),
    generatedBy: { userId: actor.userId, organizationId: actor.organizationId, roles: actor.roles },
    snapshotBoundary: {
      statement: "This is an ops evidence snapshot, not a live MarketplaceListing, supplier PDF verdict, Order, or finished-product certificate.",
      currency: "Re-check VLE listing eligibility and TECRID evidence status after the generatedAt time.",
      allowedClaim: "Passed Compliance Profile X",
      forbiddenInference: "No finished-product safety, absence, or guarantee claim is made.",
    },
    statusAtExport: {
      publicationGateEligible: gate.allowed,
      publicationGateReasons: gate.allowed ? [] : gate.reasons,
      marketplaceListed: listedAtExport,
      permittedClaim: permittedClaimAtExport,
      note: "A downloaded pack cannot keep an unlisted or newly ineligible MarketplaceListing alive.",
    },
    product: { id: header.lot.productTypeId, code: header.productCode, name: header.productName },
    supplierOrganization: { id: header.lot.supplierOrganizationId, slug: header.supplierSlug, name: header.supplierName },
    physicalLot: header.lot,
    inventoryVerification: {
      identityConfirmedAt: header.lot.identityConfirmedAt,
      quantityVerifiedAt: header.lot.quantityVerifiedAt,
      locationVerifiedAt: header.lot.locationVerifiedAt,
      authorityToSellVerifiedAt: header.lot.authorityToSellVerifiedAt,
    },
    samplingOrders: orders,
    samples: lotSamples,
    tecridEvidence: evidence,
    qualificationDecisions: decisions,
    marketplaceListingHistory: listings,
    backgroundArtifacts: {
      classification: "SUPPLIER_CONTEXT_ONLY_NOT_TECRID_EVIDENCE",
      records: artifacts,
    },
    auditTrail: {
      scope: "Related-entity excerpt from VLE's global append-only hash chain; previousHash may point to an event outside this single-lot pack.",
      events: auditTrail,
      latestIncludedEventHash: auditTrail.at(-1)?.eventHash ?? null,
    },
  };
  return addCompliancePackChecksum(payload);
}
