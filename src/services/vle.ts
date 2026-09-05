import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  auditEvents,
  buyerRequirements,
  complianceProfiles,
  complianceProfileVersions,
  marketplaceListings,
  organizations,
  physicalLots,
  productTypes,
  qualificationDecisions,
  reservationIntents,
  samples,
  samplingOrders,
  tecridEvidence,
} from "@/db/schema";
import { assertPermission, assertTenant, type Actor } from "@/domain/authz";
import { DomainError } from "@/domain/errors";
import { evaluatePublicationGate } from "@/domain/publication";
import { qualify } from "@/domain/qualification";
import { assertSamplingTransition } from "@/domain/sampling";
import { assertLotTransition } from "@/domain/lot-state";
import type { LimitRule, QualificationOutcome, ResultValue, SamplingStatus } from "@/domain/types";
import type { TecridAdapter } from "@/adapters/tecrid";
import { appendAuditEvent } from "./audit";

const ENGINE_VERSION = "vle-deterministic-1";

export async function nominateLot(actor: Actor, input: {
  supplierOrganizationId: string; productTypeId: string; supplierLotCode: string;
  quantity: string; quantityUnit: string; locationName: string; countryCode: string; ownerName: string;
}) {
  assertPermission(actor, "NOMINATE_LOT");
  assertTenant(actor, input.supplierOrganizationId);
  const db = getDb();
  return db.transaction(async (tx) => {
    const [lot] = await tx.insert(physicalLots).values(input).returning();
    await appendAuditEvent(tx, actor, { eventType: "LOT_NOMINATED", entityType: "PhysicalLot", entityId: lot.id, data: input });
    return lot;
  });
}

export async function createProfileVersion(actor: Actor, input: { profileId: string; version: string; rules: readonly LimitRule[]; notes: string }) {
  assertPermission(actor, "MANAGE_PROFILES");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [version] = await tx.insert(complianceProfileVersions).values({ ...input, status: "DRAFT", createdByUserId: actor.userId }).returning();
    await appendAuditEvent(tx, actor, { eventType: "PROFILE_VERSION_CREATED", entityType: "ComplianceProfileVersion", entityId: version.id, data: { profileId: input.profileId, version: input.version } });
    return version;
  });
}

export async function freezeProfileVersion(actor: Actor, profileVersionId: string, now = new Date()) {
  assertPermission(actor, "MANAGE_PROFILES");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [version] = await tx.update(complianceProfileVersions).set({ status: "FROZEN", frozenAt: now }).where(and(eq(complianceProfileVersions.id, profileVersionId), eq(complianceProfileVersions.status, "DRAFT"))).returning();
    if (!version) throw new DomainError("Only a draft profile version can be frozen", "INVALID_TRANSITION");
    await appendAuditEvent(tx, actor, { eventType: "PROFILE_VERSION_FROZEN", entityType: "ComplianceProfileVersion", entityId: version.id, data: { version: version.version, frozenAt: now } });
    return version;
  });
}

export async function verifyLotInventory(actor: Actor, lotId: string) {
  assertPermission(actor, "MANAGE_SAMPLING");
  const db = getDb();
  const now = new Date();
  return db.transaction(async (tx) => {
    const [lot] = await tx.update(physicalLots).set({ identityConfirmedAt: now, quantityVerifiedAt: now, locationVerifiedAt: now, authorityToSellVerifiedAt: now }).where(eq(physicalLots.id, lotId)).returning();
    if (!lot) throw new DomainError("Physical lot not found", "NOT_FOUND");
    await appendAuditEvent(tx, actor, { eventType: "LOT_INVENTORY_VERIFIED", entityType: "PhysicalLot", entityId: lot.id, data: { verifiedAt: now } });
    return lot;
  });
}

export async function createSamplingOrder(actor: Actor, lotId: string) {
  assertPermission(actor, "MANAGE_SAMPLING");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [lot] = await tx.select().from(physicalLots).where(eq(physicalLots.id, lotId)).limit(1);
    if (!lot) throw new DomainError("Physical lot not found", "NOT_FOUND");
    if (lot.status !== "NOMINATED") throw new DomainError("Sampling can only start for a nominated lot", "INVALID_TRANSITION");
    assertLotTransition(lot.status, "SAMPLING");
    const [order] = await tx.insert(samplingOrders).values({ physicalLotId: lotId, requestedByOrganizationId: actor.organizationId }).returning();
    await tx.update(physicalLots).set({ status: "SAMPLING" }).where(eq(physicalLots.id, lotId));
    await appendAuditEvent(tx, actor, { eventType: "SAMPLING_ORDER_CREATED", entityType: "SamplingOrder", entityId: order.id, data: { lotId } });
    return order;
  });
}

export async function advanceSamplingOrder(actor: Actor, orderId: string, to: SamplingStatus, sampleInput?: {
  sampleCode: string; samplerName: string; method: string; sealIdentifiers: readonly string[]; chainOfCustody: unknown;
}) {
  assertPermission(actor, "MANAGE_SAMPLING");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(samplingOrders).where(eq(samplingOrders.id, orderId)).limit(1);
    if (!order) throw new DomainError("Sampling order not found", "NOT_FOUND");
    assertSamplingTransition(order.status, to);
    if (to === "COLLECTED" && !sampleInput) throw new DomainError("Collection requires a sample record", "SAMPLE_REQUIRED");
    const [updated] = await tx.update(samplingOrders).set({ status: to }).where(eq(samplingOrders.id, orderId)).returning();
    if (to === "COLLECTED" && sampleInput) await tx.insert(samples).values({ samplingOrderId: order.id, physicalLotId: order.physicalLotId, sampledAt: new Date(), ...sampleInput });
    await appendAuditEvent(tx, actor, { eventType: `SAMPLING_${to}`, entityType: "SamplingOrder", entityId: order.id, data: { from: order.status, to } });
    return updated;
  });
}

export async function ingestTecridEvidence(actor: Actor, sampleId: string, tecridId: string, adapter: TecridAdapter) {
  assertPermission(actor, "INGEST_EVIDENCE");
  const db = getDb();
  const [sample] = await db.select().from(samples).where(eq(samples.id, sampleId)).limit(1);
  if (!sample) throw new DomainError("Sample not found", "NOT_FOUND");
  const [order] = await db.select().from(samplingOrders).where(eq(samplingOrders.id, sample.samplingOrderId)).limit(1);
  if (order.status !== "COMPLETED") throw new DomainError("Sampling and custody workflow must be complete", "SAMPLING_INCOMPLETE");
  const envelope = await adapter.verify(tecridId);
  if (envelope.sampleCode !== sample.sampleCode) throw new DomainError("TECRID sample binding does not match", "SAMPLE_MISMATCH");
  return db.transaction(async (tx) => {
    const [lot] = await tx.select().from(physicalLots).where(eq(physicalLots.id, sample.physicalLotId)).limit(1);
    assertLotTransition(lot.status, "EVIDENCE_RECEIVED");
    const [evidence] = await tx.insert(tecridEvidence).values({ sampleId, tecridId: envelope.tecridId, issuer: envelope.issuer, issuedAt: new Date(envelope.issuedAt), expiresAt: new Date(envelope.expiresAt), results: envelope.results, payloadHash: envelope.payloadHash, verifiedAt: new Date(envelope.verifiedAt) }).returning();
    await tx.update(physicalLots).set({ status: "EVIDENCE_RECEIVED" }).where(eq(physicalLots.id, sample.physicalLotId));
    await appendAuditEvent(tx, actor, { eventType: "TECRID_EVIDENCE_VERIFIED", entityType: "TECRID", entityId: evidence.id, data: { tecridId, sampleId } });
    return evidence;
  });
}

export async function qualifyLot(actor: Actor, lotId: string, evidenceId: string, profileVersionId: string, now = new Date()) {
  assertPermission(actor, "QUALIFY_LOT");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ lot: physicalLots, sample: samples, evidence: tecridEvidence, profile: complianceProfileVersions, profileProductTypeId: complianceProfiles.productTypeId }).from(tecridEvidence)
      .innerJoin(samples, eq(samples.id, tecridEvidence.sampleId)).innerJoin(physicalLots, eq(physicalLots.id, samples.physicalLotId))
      .innerJoin(complianceProfileVersions, eq(complianceProfileVersions.id, profileVersionId))
      .innerJoin(complianceProfiles, eq(complianceProfiles.id, complianceProfileVersions.profileId))
      .where(and(eq(tecridEvidence.id, evidenceId), eq(physicalLots.id, lotId))).limit(1);
    if (!row) throw new DomainError("Qualification inputs do not resolve to the same lot", "INPUT_MISMATCH");
    if (row.profile.status !== "FROZEN") throw new DomainError("Only a frozen profile version can be evaluated", "PROFILE_NOT_FROZEN");
    if (row.profileProductTypeId !== row.lot.productTypeId) throw new DomainError("Compliance profile does not apply to the lot product", "PROFILE_PRODUCT_MISMATCH");
    const result = qualify({ id: row.profile.id, version: row.profile.version, status: "FROZEN", rules: row.profile.rules as LimitRule[] }, { id: row.evidence.id, status: row.evidence.status, issuedAt: row.evidence.issuedAt, expiresAt: row.evidence.expiresAt, results: row.evidence.results as ResultValue[] }, now);
    assertLotTransition(row.lot.status, result.outcome);
    const [decision] = await tx.insert(qualificationDecisions).values({ physicalLotId: lotId, sampleId: row.sample.id, evidenceId, profileVersionId, outcome: result.outcome, rationale: result.rationale, engineVersion: ENGINE_VERSION, inputHash: result.inputHash, decidedAt: now, decidedByUserId: actor.userId }).returning();
    await tx.update(physicalLots).set({ status: result.outcome }).where(eq(physicalLots.id, lotId));
    await appendAuditEvent(tx, actor, { eventType: "QUALIFICATION_DECIDED", entityType: "QualificationDecision", entityId: decision.id, data: { outcome: result.outcome, inputHash: result.inputHash } });
    return decision;
  });
}

export async function publishListing(actor: Actor, lotId: string, decisionId: string, now = new Date()) {
  assertPermission(actor, "PUBLISH_LISTING");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ lot: physicalLots, decision: qualificationDecisions, evidence: tecridEvidence, profile: complianceProfileVersions, productCode: productTypes.code }).from(qualificationDecisions)
      .innerJoin(physicalLots, eq(physicalLots.id, qualificationDecisions.physicalLotId)).innerJoin(tecridEvidence, eq(tecridEvidence.id, qualificationDecisions.evidenceId))
      .innerJoin(complianceProfileVersions, eq(complianceProfileVersions.id, qualificationDecisions.profileVersionId))
      .innerJoin(productTypes, eq(productTypes.id, physicalLots.productTypeId))
      .where(and(eq(qualificationDecisions.id, decisionId), eq(physicalLots.id, lotId))).limit(1);
    if (!row) throw new DomainError("Decision does not belong to physical lot", "INPUT_MISMATCH");
    const [sampling] = await tx.select({ id: samples.id }).from(samples).where(eq(samples.physicalLotId, lotId)).limit(1);
    const gate = evaluatePublicationGate({ identityConfirmedAt: row.lot.identityConfirmedAt, quantityVerifiedAt: row.lot.quantityVerifiedAt, locationVerifiedAt: row.lot.locationVerifiedAt, authorityToSellVerifiedAt: row.lot.authorityToSellVerifiedAt, samplingRecorded: Boolean(sampling), evidenceStatus: row.evidence.status, evidenceExpiresAt: row.evidence.expiresAt, decisionOutcome: row.decision.outcome, profileFrozen: row.profile.status === "FROZEN", heldAt: row.lot.heldAt, revokedAt: row.lot.revokedAt, transformedAt: row.lot.transformedAt, depletedAt: row.lot.depletedAt }, now);
    if (!gate.allowed) throw new DomainError(gate.reasons.join("; "), "PUBLICATION_GATE_FAILED");
    const publicSlug = `${row.productCode.toLowerCase().replaceAll("_", "-")}-${lotId.slice(0, 8)}-${now.getTime()}`;
    const [listing] = await tx.insert(marketplaceListings).values({ physicalLotId: lotId, qualificationDecisionId: decisionId, status: "LISTED", publicSlug, publishedAt: now }).returning();
    await appendAuditEvent(tx, actor, { eventType: "LISTING_PUBLISHED", entityType: "MarketplaceListing", entityId: listing.id, data: { lotId, decisionId } });
    return listing;
  });
}

export async function revokeEvidence(actor: Actor, evidenceId: string, reason: string, now = new Date()) {
  assertPermission(actor, "HOLD_OR_REVOKE");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [currentEvidence] = await tx.select().from(tecridEvidence).where(eq(tecridEvidence.id, evidenceId)).limit(1);
    if (!currentEvidence) throw new DomainError("TECRID evidence not found", "NOT_FOUND");
    const [sample] = await tx.select().from(samples).where(eq(samples.id, currentEvidence.sampleId)).limit(1);
    const [lot] = await tx.select().from(physicalLots).where(eq(physicalLots.id, sample.physicalLotId)).limit(1);
    assertLotTransition(lot.status, "REVOKED");
    const activeListings = await tx.select({ id: marketplaceListings.id }).from(marketplaceListings).where(and(eq(marketplaceListings.physicalLotId, sample.physicalLotId), eq(marketplaceListings.status, "LISTED")));
    const activeReservations = activeListings.length ? await tx.select({ id: reservationIntents.id }).from(reservationIntents).where(and(inArray(reservationIntents.marketplaceListingId, activeListings.map(({ id }) => id)), eq(reservationIntents.status, "ACTIVE"))) : [];
    const [evidence] = await tx.update(tecridEvidence).set({ status: "REVOKED", revokedAt: now, revocationReason: reason }).where(eq(tecridEvidence.id, evidenceId)).returning();
    await tx.update(physicalLots).set({ status: "REVOKED", revokedAt: now }).where(eq(physicalLots.id, sample.physicalLotId));
    await tx.update(marketplaceListings).set({ status: "UNLISTED", unpublishedAt: now, unpublishReason: `TECRID revoked: ${reason}` }).where(and(eq(marketplaceListings.physicalLotId, sample.physicalLotId), eq(marketplaceListings.status, "LISTED")));
    await appendAuditEvent(tx, actor, { eventType: "TECRID_EVIDENCE_REVOKED", entityType: "TECRID", entityId: evidence.id, data: { reason, automaticallyUnlisted: activeListings.map((item) => item.id) } });
    for (const reservation of activeReservations) await appendAuditEvent(tx, actor, { eventType: "RESERVATION_INTENT_INVALIDATED", entityType: "ReservationIntent", entityId: reservation.id, data: { reason: `TECRID revoked: ${reason}`, listingIds: activeListings.map(({ id }) => id) } });
    return { evidence, unpublished: activeListings };
  });
}

export async function placeLotOnHold(actor: Actor, lotId: string, reason: string, now = new Date()) {
  assertPermission(actor, "HOLD_OR_REVOKE");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(physicalLots).where(eq(physicalLots.id, lotId)).limit(1);
    if (!current) throw new DomainError("Physical lot not found", "NOT_FOUND");
    assertLotTransition(current.status, "HELD");
    const activeListings = await tx.select({ id: marketplaceListings.id }).from(marketplaceListings).where(and(eq(marketplaceListings.physicalLotId, lotId), eq(marketplaceListings.status, "LISTED")));
    const activeReservations = activeListings.length ? await tx.select({ id: reservationIntents.id }).from(reservationIntents).where(and(inArray(reservationIntents.marketplaceListingId, activeListings.map(({ id }) => id)), eq(reservationIntents.status, "ACTIVE"))) : [];
    const [lot] = await tx.update(physicalLots).set({ status: "HELD", heldAt: now, holdReason: reason }).where(eq(physicalLots.id, lotId)).returning();
    await tx.update(marketplaceListings).set({ status: "UNLISTED", unpublishedAt: now, unpublishReason: `Lot hold: ${reason}` }).where(and(eq(marketplaceListings.physicalLotId, lotId), eq(marketplaceListings.status, "LISTED")));
    await appendAuditEvent(tx, actor, { eventType: "LOT_HELD", entityType: "PhysicalLot", entityId: lotId, data: { reason, automaticallyUnlisted: activeListings.map((item) => item.id) } });
    for (const reservation of activeReservations) await appendAuditEvent(tx, actor, { eventType: "RESERVATION_INTENT_INVALIDATED", entityType: "ReservationIntent", entityId: reservation.id, data: { reason: `Lot hold: ${reason}`, listingIds: activeListings.map(({ id }) => id) } });
    return { lot, unpublished: activeListings };
  });
}

export async function reconcileExpiredListings(now = new Date()) {
  const db = getDb();
  const expired = await db.select({ listingId: marketplaceListings.id, lotId: marketplaceListings.physicalLotId })
    .from(marketplaceListings)
    .innerJoin(qualificationDecisions, eq(qualificationDecisions.id, marketplaceListings.qualificationDecisionId))
    .innerJoin(tecridEvidence, eq(tecridEvidence.id, qualificationDecisions.evidenceId))
    .innerJoin(physicalLots, eq(physicalLots.id, marketplaceListings.physicalLotId))
    .where(and(
      eq(marketplaceListings.status, "LISTED"),
      sql`(${tecridEvidence.status} <> 'CURRENT' OR ${tecridEvidence.expiresAt} <= ${now} OR ${physicalLots.heldAt} IS NOT NULL OR ${physicalLots.revokedAt} IS NOT NULL OR ${physicalLots.transformedAt} IS NOT NULL OR ${physicalLots.depletedAt} IS NOT NULL)`,
    ));
  if (!expired.length) return 0;
  return db.transaction(async (tx) => {
    const activeReservations = await tx.select({ id: reservationIntents.id, listingId: reservationIntents.marketplaceListingId }).from(reservationIntents).where(and(inArray(reservationIntents.marketplaceListingId, expired.map((item) => item.listingId)), eq(reservationIntents.status, "ACTIVE")));
    await tx.update(marketplaceListings).set({ status: "UNLISTED", unpublishedAt: now, unpublishReason: "Automatic eligibility reconciliation" }).where(inArray(marketplaceListings.id, expired.map((item) => item.listingId)));
    for (const item of expired) await appendAuditEvent(tx, null, { eventType: "LISTING_AUTO_UNLISTED", entityType: "MarketplaceListing", entityId: item.listingId, data: { lotId: item.lotId } });
    for (const reservation of activeReservations) await appendAuditEvent(tx, null, { eventType: "RESERVATION_INTENT_INVALIDATED", entityType: "ReservationIntent", entityId: reservation.id, data: { reason: "Automatic listing eligibility reconciliation", listingId: reservation.listingId } });
    return expired.length;
  });
}

export async function createBuyerRequirement(actor: Actor, input: {
  productTypeId: string; profileVersionId: string; quantity: string; quantityUnit: string; destination: string; notes?: string;
}) {
  assertPermission(actor, "CREATE_REQUIREMENT");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [requirement] = await tx.insert(buyerRequirements).values({ buyerOrganizationId: actor.organizationId, ...input }).returning();
    await appendAuditEvent(tx, actor, { eventType: "BUYER_REQUIREMENT_CREATED", entityType: "BuyerRequirement", entityId: requirement.id, data: input });
    return requirement;
  });
}

export async function listPublicListings() {
  await reconcileExpiredListings();
  return getDb().select({
    id: marketplaceListings.id, slug: marketplaceListings.publicSlug, lotCode: physicalLots.supplierLotCode,
    quantity: physicalLots.quantity, quantityUnit: physicalLots.quantityUnit, location: physicalLots.locationName,
    countryCode: physicalLots.countryCode,
    supplier: organizations.name, product: productTypes.name, productCode: productTypes.code, decision: qualificationDecisions.outcome,
    profileName: complianceProfiles.name, profileVersion: complianceProfileVersions.version,
    evidenceStatus: tecridEvidence.status, evidenceExpiresAt: tecridEvidence.expiresAt,
    publishedAt: marketplaceListings.publishedAt,
  }).from(marketplaceListings)
    .innerJoin(physicalLots, eq(physicalLots.id, marketplaceListings.physicalLotId))
    .innerJoin(organizations, eq(organizations.id, physicalLots.supplierOrganizationId))
    .innerJoin(productTypes, eq(productTypes.id, physicalLots.productTypeId))
    .innerJoin(qualificationDecisions, eq(qualificationDecisions.id, marketplaceListings.qualificationDecisionId))
    .innerJoin(tecridEvidence, eq(tecridEvidence.id, qualificationDecisions.evidenceId))
    .innerJoin(complianceProfileVersions, eq(complianceProfileVersions.id, qualificationDecisions.profileVersionId))
    .innerJoin(complianceProfiles, eq(complianceProfiles.id, complianceProfileVersions.profileId))
    .where(and(
      eq(marketplaceListings.status, "LISTED"), eq(qualificationDecisions.outcome, "QUALIFIED"),
      eq(complianceProfileVersions.status, "FROZEN"), eq(tecridEvidence.status, "CURRENT"),
      sql`${tecridEvidence.expiresAt} > now()`, sql`${physicalLots.heldAt} IS NULL`, sql`${physicalLots.revokedAt} IS NULL`,
      sql`${physicalLots.transformedAt} IS NULL`, sql`${physicalLots.depletedAt} IS NULL`,
    ));
}

export async function listPilotLanes() {
  return getDb().select({
    productTypeId: productTypes.id, productCode: productTypes.code, product: productTypes.name,
    profileName: complianceProfiles.name, profileVersion: complianceProfileVersions.version,
  }).from(productTypes)
    .innerJoin(complianceProfiles, eq(complianceProfiles.productTypeId, productTypes.id))
    .innerJoin(complianceProfileVersions, eq(complianceProfileVersions.profileId, complianceProfiles.id))
    .where(and(inArray(productTypes.code, ["COCOA_POWDER", "AVOCADO_FRUIT"]), eq(complianceProfileVersions.status, "FROZEN")))
    .orderBy(productTypes.name);
}

export async function listOpsLots() {
  return getDb().select({
    id: physicalLots.id, lotCode: physicalLots.supplierLotCode, status: physicalLots.status,
    product: productTypes.name, productCode: productTypes.code,
    supplier: organizations.name, quantity: physicalLots.quantity, quantityUnit: physicalLots.quantityUnit,
    location: physicalLots.locationName, countryCode: physicalLots.countryCode, createdAt: physicalLots.createdAt,
    identityConfirmedAt: physicalLots.identityConfirmedAt, quantityVerifiedAt: physicalLots.quantityVerifiedAt,
    locationVerifiedAt: physicalLots.locationVerifiedAt, authorityToSellVerifiedAt: physicalLots.authorityToSellVerifiedAt,
    samplingStatus: sql<SamplingStatus | null>`(
      select status from sampling_orders
      where physical_lot_id = ${physicalLots.id}
      order by created_at desc limit 1
    )`,
    evidenceStatus: sql<"CURRENT" | "REVOKED" | null>`(
      select e.status from tecrid_evidence e
      join samples s on s.id = e.sample_id
      where s.physical_lot_id = ${physicalLots.id}
      order by e.created_at desc limit 1
    )`,
    decisionOutcome: sql<QualificationOutcome | null>`(
      select outcome from qualification_decisions
      where physical_lot_id = ${physicalLots.id}
      order by decided_at desc limit 1
    )`,
    listingStatus: sql<"LISTED" | "UNLISTED" | null>`(
      select status from marketplace_listings
      where physical_lot_id = ${physicalLots.id}
      order by published_at desc limit 1
    )`,
  }).from(physicalLots)
    .innerJoin(organizations, eq(organizations.id, physicalLots.supplierOrganizationId))
    .innerJoin(productTypes, eq(productTypes.id, physicalLots.productTypeId))
    .orderBy(desc(physicalLots.createdAt));
}

export async function getOpsLotWorkflow(lotId: string) {
  const db = getDb();
  const [lot] = await db.select({ lot: physicalLots, supplier: organizations.name, product: productTypes.name, productCode: productTypes.code })
    .from(physicalLots)
    .innerJoin(organizations, eq(organizations.id, physicalLots.supplierOrganizationId))
    .innerJoin(productTypes, eq(productTypes.id, physicalLots.productTypeId))
    .where(eq(physicalLots.id, lotId)).limit(1);
  if (!lot) return null;
  const [order] = await db.select().from(samplingOrders).where(eq(samplingOrders.physicalLotId, lotId)).orderBy(desc(samplingOrders.createdAt)).limit(1);
  const [sample] = order ? await db.select().from(samples).where(eq(samples.samplingOrderId, order.id)).limit(1) : [];
  const [evidence] = sample ? await db.select().from(tecridEvidence).where(eq(tecridEvidence.sampleId, sample.id)).orderBy(desc(tecridEvidence.createdAt)).limit(1) : [];
  const [decision] = await db.select().from(qualificationDecisions).where(eq(qualificationDecisions.physicalLotId, lotId)).orderBy(desc(qualificationDecisions.decidedAt)).limit(1);
  const [listing] = await db.select().from(marketplaceListings).where(eq(marketplaceListings.physicalLotId, lotId)).orderBy(desc(marketplaceListings.publishedAt)).limit(1);
  const [profile] = await db.select({ id: complianceProfileVersions.id, version: complianceProfileVersions.version, status: complianceProfileVersions.status, profileName: complianceProfiles.name })
    .from(complianceProfileVersions)
    .innerJoin(complianceProfiles, eq(complianceProfiles.id, complianceProfileVersions.profileId))
    .where(and(eq(complianceProfileVersions.status, "FROZEN"), eq(complianceProfiles.productTypeId, lot.lot.productTypeId)))
    .limit(1);
  return { ...lot, order, sample, evidence, decision, listing, profile };
}

export async function getPublicListing(slug: string) {
  await reconcileExpiredListings();
  const [listing] = await getDb().select({
    id: marketplaceListings.id, slug: marketplaceListings.publicSlug, lotCode: physicalLots.supplierLotCode,
    quantity: physicalLots.quantity, quantityUnit: physicalLots.quantityUnit, location: physicalLots.locationName,
    countryCode: physicalLots.countryCode, supplier: organizations.name, product: productTypes.name,
    decision: qualificationDecisions.outcome, profileVersion: complianceProfileVersions.version,
    profileName: complianceProfiles.name, evidenceStatus: tecridEvidence.status,
    evidenceIssuedAt: tecridEvidence.issuedAt, evidenceExpiresAt: tecridEvidence.expiresAt,
    evidenceVerifiedAt: tecridEvidence.verifiedAt,
    publishedAt: marketplaceListings.publishedAt,
  }).from(marketplaceListings)
    .innerJoin(physicalLots, eq(physicalLots.id, marketplaceListings.physicalLotId))
    .innerJoin(organizations, eq(organizations.id, physicalLots.supplierOrganizationId))
    .innerJoin(productTypes, eq(productTypes.id, physicalLots.productTypeId))
    .innerJoin(qualificationDecisions, eq(qualificationDecisions.id, marketplaceListings.qualificationDecisionId))
    .innerJoin(tecridEvidence, eq(tecridEvidence.id, qualificationDecisions.evidenceId))
    .innerJoin(complianceProfileVersions, eq(complianceProfileVersions.id, qualificationDecisions.profileVersionId))
    .innerJoin(complianceProfiles, eq(complianceProfiles.id, complianceProfileVersions.profileId))
    .where(and(
      eq(marketplaceListings.publicSlug, slug), eq(marketplaceListings.status, "LISTED"),
      eq(qualificationDecisions.outcome, "QUALIFIED"), eq(complianceProfileVersions.status, "FROZEN"),
      eq(tecridEvidence.status, "CURRENT"), sql`${tecridEvidence.expiresAt} > now()`,
      sql`${physicalLots.heldAt} IS NULL`, sql`${physicalLots.revokedAt} IS NULL`,
      sql`${physicalLots.transformedAt} IS NULL`, sql`${physicalLots.depletedAt} IS NULL`,
    )).limit(1);
  return listing ?? null;
}

export async function getCocoaReferenceData() {
  const db = getDb();
  const [product] = await db.select().from(productTypes).where(eq(productTypes.code, "COCOA_POWDER")).limit(1);
  const [profile] = product
    ? await db.select({ id: complianceProfileVersions.id, profileId: complianceProfileVersions.profileId, version: complianceProfileVersions.version, status: complianceProfileVersions.status, rules: complianceProfileVersions.rules, notes: complianceProfileVersions.notes, frozenAt: complianceProfileVersions.frozenAt, createdByUserId: complianceProfileVersions.createdByUserId, createdAt: complianceProfileVersions.createdAt })
      .from(complianceProfileVersions)
      .innerJoin(complianceProfiles, eq(complianceProfiles.id, complianceProfileVersions.profileId))
      .where(and(eq(complianceProfileVersions.status, "FROZEN"), eq(complianceProfiles.productTypeId, product.id)))
      .limit(1)
    : [];
  return { product, profile };
}

export async function listAuditEvents(limit = 30) {
  return getDb().select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(limit);
}
