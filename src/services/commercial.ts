import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  buyerRequirements,
  complianceProfiles,
  complianceProfileVersions,
  marketplaceListings,
  organizations,
  physicalLots,
  productTypes,
  qualificationDecisions,
  requirementMatches,
  reservationIntents,
  supplierQuotes,
  tecridEvidence,
} from "@/db/schema";
import { assertPermission, assertTenant, type Actor } from "@/domain/authz";
import {
  assertCommercialVisibility,
  assertQuoteTransition,
  assertReservationTransition,
  isEligibleRequirementMatch,
} from "@/domain/commercial";
import { DomainError } from "@/domain/errors";
import type { SupplierQuoteStatus } from "@/domain/types";
import { appendAuditEvent } from "./audit";
import { reconcileExpiredListings } from "./vle";

function isPlatform(actor: Actor) {
  return actor.roles.some((role) => role === "OPS" || role === "ADMIN");
}

export async function reconcileCommercialState(now = new Date()) {
  await reconcileExpiredListings(now);
  const db = getDb();
  const [expiredQuotes, expiredReservations] = await Promise.all([
    db.select({ id: supplierQuotes.id }).from(supplierQuotes).where(and(inArray(supplierQuotes.status, ["DRAFT", "SENT"]), lte(supplierQuotes.expiresAt, now))),
    db.select({ id: reservationIntents.id }).from(reservationIntents).where(and(eq(reservationIntents.status, "ACTIVE"), lte(reservationIntents.expiresAt, now))),
  ]);
  if (!expiredQuotes.length && !expiredReservations.length) return { quotes: 0, reservations: 0 };
  await db.transaction(async (tx) => {
    if (expiredQuotes.length) {
      await tx.update(supplierQuotes).set({ status: "EXPIRED", expiredAt: now }).where(inArray(supplierQuotes.id, expiredQuotes.map(({ id }) => id)));
      for (const { id } of expiredQuotes) await appendAuditEvent(tx, null, { eventType: "SUPPLIER_QUOTE_EXPIRED", entityType: "SupplierQuote", entityId: id, data: { expiredAt: now } });
    }
    if (expiredReservations.length) {
      await tx.update(reservationIntents).set({ status: "EXPIRED", expiredAt: now, statusReason: "Reservation intent expiry reached" }).where(inArray(reservationIntents.id, expiredReservations.map(({ id }) => id)));
      for (const { id } of expiredReservations) await appendAuditEvent(tx, null, { eventType: "RESERVATION_INTENT_EXPIRED", entityType: "ReservationIntent", entityId: id, data: { expiredAt: now } });
    }
  });
  return { quotes: expiredQuotes.length, reservations: expiredReservations.length };
}

export async function matchBuyerRequirement(actor: Actor, requirementId: string, now = new Date()) {
  assertPermission(actor, "MANAGE_MATCHES");
  await reconcileCommercialState(now);
  const db = getDb();
  const [requirement] = await db.select({ requirement: buyerRequirements, productCode: productTypes.code, profileStatus: complianceProfileVersions.status })
    .from(buyerRequirements)
    .innerJoin(productTypes, eq(productTypes.id, buyerRequirements.productTypeId))
    .innerJoin(complianceProfileVersions, eq(complianceProfileVersions.id, buyerRequirements.profileVersionId))
    .where(eq(buyerRequirements.id, requirementId)).limit(1);
  if (!requirement) throw new DomainError("Buyer requirement not found", "NOT_FOUND");
  if (requirement.productCode !== "COCOA_POWDER") throw new DomainError("Phase B matching is cocoa powder only", "PRODUCT_OUT_OF_SCOPE");
  if (requirement.profileStatus !== "FROZEN") throw new DomainError("Matching requires a frozen profile version", "PROFILE_NOT_FROZEN");

  const eligibleListings = await db.select({
    listingId: marketplaceListings.id,
    profileVersionId: qualificationDecisions.profileVersionId,
  }).from(marketplaceListings)
    .innerJoin(physicalLots, eq(physicalLots.id, marketplaceListings.physicalLotId))
    .innerJoin(qualificationDecisions, eq(qualificationDecisions.id, marketplaceListings.qualificationDecisionId))
    .innerJoin(tecridEvidence, eq(tecridEvidence.id, qualificationDecisions.evidenceId))
    .innerJoin(complianceProfileVersions, eq(complianceProfileVersions.id, qualificationDecisions.profileVersionId))
    .where(and(
      eq(marketplaceListings.status, "LISTED"),
      eq(physicalLots.productTypeId, requirement.requirement.productTypeId),
      eq(qualificationDecisions.profileVersionId, requirement.requirement.profileVersionId),
      eq(qualificationDecisions.outcome, "QUALIFIED"),
      eq(complianceProfileVersions.status, "FROZEN"),
      eq(tecridEvidence.status, "CURRENT"),
      sql`${tecridEvidence.expiresAt} > ${now}`,
      sql`${physicalLots.quantity} >= ${requirement.requirement.quantity}`,
      eq(physicalLots.quantityUnit, requirement.requirement.quantityUnit),
      sql`${physicalLots.identityConfirmedAt} IS NOT NULL`, sql`${physicalLots.quantityVerifiedAt} IS NOT NULL`,
      sql`${physicalLots.locationVerifiedAt} IS NOT NULL`, sql`${physicalLots.authorityToSellVerifiedAt} IS NOT NULL`,
      sql`${physicalLots.heldAt} IS NULL`, sql`${physicalLots.revokedAt} IS NULL`,
      sql`${physicalLots.transformedAt} IS NULL`, sql`${physicalLots.depletedAt} IS NULL`,
    ));

  return db.transaction(async (tx) => {
    const created = [];
    for (const listing of eligibleListings) {
      const [match] = await tx.insert(requirementMatches).values({
        buyerRequirementId: requirementId,
        marketplaceListingId: listing.listingId,
        profileVersionId: listing.profileVersionId,
        matchedByUserId: actor.userId,
        matchedAt: now,
      }).onConflictDoNothing().returning();
      if (!match) continue;
      created.push(match);
      await appendAuditEvent(tx, actor, { eventType: "REQUIREMENT_MATCH_CREATED", entityType: "RequirementMatch", entityId: match.id, data: { requirementId, listingId: listing.listingId, profileVersionId: listing.profileVersionId } });
    }
    return created;
  });
}

export async function createSupplierQuote(actor: Actor, input: {
  requirementMatchId: string; quantity: string; quantityUnit: string; unitPrice: string;
  currency: string; terms?: string; expiresAt: Date;
}, now = new Date()) {
  assertPermission(actor, "CREATE_QUOTE");
  await reconcileCommercialState(now);
  const db = getDb();
  const [row] = await db.select({
    match: requirementMatches, requirement: buyerRequirements, listing: marketplaceListings,
    lot: physicalLots, decision: qualificationDecisions, evidence: tecridEvidence,
    profile: complianceProfileVersions, productCode: productTypes.code,
  }).from(requirementMatches)
    .innerJoin(buyerRequirements, eq(buyerRequirements.id, requirementMatches.buyerRequirementId))
    .innerJoin(productTypes, eq(productTypes.id, buyerRequirements.productTypeId))
    .innerJoin(marketplaceListings, eq(marketplaceListings.id, requirementMatches.marketplaceListingId))
    .innerJoin(physicalLots, eq(physicalLots.id, marketplaceListings.physicalLotId))
    .innerJoin(qualificationDecisions, eq(qualificationDecisions.id, marketplaceListings.qualificationDecisionId))
    .innerJoin(tecridEvidence, eq(tecridEvidence.id, qualificationDecisions.evidenceId))
    .innerJoin(complianceProfileVersions, eq(complianceProfileVersions.id, qualificationDecisions.profileVersionId))
    .where(eq(requirementMatches.id, input.requirementMatchId)).limit(1);
  if (!row) throw new DomainError("Requirement match not found", "NOT_FOUND");
  assertTenant(actor, row.lot.supplierOrganizationId);
  if (row.match.status !== "ACTIVE" || !isEligibleRequirementMatch({
    requirementProductCode: row.productCode,
    requirementProductTypeId: row.requirement.productTypeId,
    requirementProfileVersionId: row.requirement.profileVersionId,
    requirementQuantity: Number(row.requirement.quantity),
    requirementQuantityUnit: row.requirement.quantityUnit,
    listingStatus: row.listing.status,
    listingProductTypeId: row.lot.productTypeId,
    listingProfileVersionId: row.decision.profileVersionId,
    availableQuantity: Number(row.lot.quantity),
    availableQuantityUnit: row.lot.quantityUnit,
    decisionOutcome: row.decision.outcome,
    profileStatus: row.profile.status,
    evidenceStatus: row.evidence.status,
    evidenceExpiresAt: row.evidence.expiresAt,
    identityConfirmedAt: row.lot.identityConfirmedAt, quantityVerifiedAt: row.lot.quantityVerifiedAt,
    locationVerifiedAt: row.lot.locationVerifiedAt, authorityToSellVerifiedAt: row.lot.authorityToSellVerifiedAt,
    heldAt: row.lot.heldAt, revokedAt: row.lot.revokedAt, transformedAt: row.lot.transformedAt, depletedAt: row.lot.depletedAt,
  }, now)) throw new DomainError("Requirement match is no longer eligible", "MATCH_INELIGIBLE");
  if (Number(input.quantity) < Number(row.requirement.quantity) || Number(input.quantity) > Number(row.lot.quantity)) throw new DomainError("Quote quantity must fulfill the requirement without exceeding lot inventory", "INVALID_QUANTITY");
  if (input.expiresAt <= now) throw new DomainError("Supplier quote expiry must be in the future", "INVALID_EXPIRY");

  return db.transaction(async (tx) => {
    const [quote] = await tx.insert(supplierQuotes).values({
      ...input,
      buyerOrganizationId: row.requirement.buyerOrganizationId,
      supplierOrganizationId: row.lot.supplierOrganizationId,
      currency: input.currency.toUpperCase(),
      createdByUserId: actor.userId,
    }).returning();
    await appendAuditEvent(tx, actor, { eventType: "SUPPLIER_QUOTE_CREATED", entityType: "SupplierQuote", entityId: quote.id, data: { requirementMatchId: row.match.id, expiresAt: input.expiresAt, currency: quote.currency } });
    return quote;
  });
}

export async function transitionSupplierQuote(actor: Actor, quoteId: string, to: Extract<SupplierQuoteStatus, "SENT" | "ACCEPTED" | "WITHDRAWN">, now = new Date()) {
  await reconcileCommercialState(now);
  const db = getDb();
  const [row] = await db.select({ quote: supplierQuotes, match: requirementMatches, listing: marketplaceListings })
    .from(supplierQuotes)
    .innerJoin(requirementMatches, eq(requirementMatches.id, supplierQuotes.requirementMatchId))
    .innerJoin(marketplaceListings, eq(marketplaceListings.id, requirementMatches.marketplaceListingId))
    .where(eq(supplierQuotes.id, quoteId)).limit(1);
  if (!row) throw new DomainError("Supplier quote not found", "NOT_FOUND");
  assertCommercialVisibility(actor, row.quote.buyerOrganizationId, row.quote.supplierOrganizationId);
  if (to === "ACCEPTED") {
    assertPermission(actor, "RESPOND_TO_QUOTE");
    assertTenant(actor, row.quote.buyerOrganizationId);
    if (row.match.status !== "ACTIVE" || row.listing.status !== "LISTED") throw new DomainError("Quote cannot be accepted after listing eligibility is lost", "MATCH_INELIGIBLE");
  } else {
    assertPermission(actor, "CREATE_QUOTE");
    assertTenant(actor, row.quote.supplierOrganizationId);
  }
  assertQuoteTransition(row.quote.status, to, row.quote.expiresAt, now);
  const timestamps = to === "SENT" ? { sentAt: now } : to === "ACCEPTED" ? { acceptedAt: now } : { withdrawnAt: now };
  return db.transaction(async (tx) => {
    const [quote] = await tx.update(supplierQuotes).set({ status: to, ...timestamps }).where(eq(supplierQuotes.id, quoteId)).returning();
    await appendAuditEvent(tx, actor, { eventType: `SUPPLIER_QUOTE_${to}`, entityType: "SupplierQuote", entityId: quoteId, data: { from: row.quote.status, to } });
    return quote;
  });
}

export async function createReservationIntent(actor: Actor, quoteId: string, expiresAt: Date, now = new Date()) {
  assertPermission(actor, "CREATE_RESERVATION_INTENT");
  await reconcileCommercialState(now);
  const db = getDb();
  const [row] = await db.select({ quote: supplierQuotes, match: requirementMatches, listing: marketplaceListings })
    .from(supplierQuotes)
    .innerJoin(requirementMatches, eq(requirementMatches.id, supplierQuotes.requirementMatchId))
    .innerJoin(marketplaceListings, eq(marketplaceListings.id, requirementMatches.marketplaceListingId))
    .where(eq(supplierQuotes.id, quoteId)).limit(1);
  if (!row) throw new DomainError("Supplier quote not found", "NOT_FOUND");
  assertTenant(actor, row.quote.buyerOrganizationId);
  if (row.quote.status !== "ACCEPTED") throw new DomainError("Reservation intent requires an accepted supplier quote", "QUOTE_NOT_ACCEPTED");
  if (row.match.status !== "ACTIVE" || row.listing.status !== "LISTED") throw new DomainError("Reservation intent requires a currently eligible listing", "MATCH_INELIGIBLE");
  if (expiresAt <= now) throw new DomainError("Reservation intent expiry must be in the future", "INVALID_EXPIRY");
  return db.transaction(async (tx) => {
    const [reservation] = await tx.insert(reservationIntents).values({
      supplierQuoteId: quoteId,
      requirementMatchId: row.match.id,
      marketplaceListingId: row.listing.id,
      buyerOrganizationId: row.quote.buyerOrganizationId,
      supplierOrganizationId: row.quote.supplierOrganizationId,
      expiresAt,
      createdByUserId: actor.userId,
    }).returning();
    await appendAuditEvent(tx, actor, { eventType: "RESERVATION_INTENT_CREATED", entityType: "ReservationIntent", entityId: reservation.id, data: { quoteId, listingId: row.listing.id, expiresAt, orderCreated: false } });
    return reservation;
  });
}

export async function cancelReservationIntent(actor: Actor, reservationId: string, reason: string, now = new Date()) {
  assertPermission(actor, "CANCEL_RESERVATION_INTENT");
  await reconcileCommercialState(now);
  const db = getDb();
  const [current] = await db.select().from(reservationIntents).where(eq(reservationIntents.id, reservationId)).limit(1);
  if (!current) throw new DomainError("Reservation intent not found", "NOT_FOUND");
  assertCommercialVisibility(actor, current.buyerOrganizationId, current.supplierOrganizationId);
  assertReservationTransition(current.status, "CANCELLED", current.expiresAt, now);
  return db.transaction(async (tx) => {
    const [reservation] = await tx.update(reservationIntents).set({ status: "CANCELLED", cancelledAt: now, statusReason: reason }).where(eq(reservationIntents.id, reservationId)).returning();
    await appendAuditEvent(tx, actor, { eventType: "RESERVATION_INTENT_CANCELLED", entityType: "ReservationIntent", entityId: reservationId, data: { reason } });
    return reservation;
  });
}

export async function listCommercialWorkspace(actor: Actor, perspective: "BUYER" | "SUPPLIER" | "OPS") {
  await reconcileCommercialState();
  if (perspective === "BUYER" && !isPlatform(actor)) assertPermission(actor, "CREATE_REQUIREMENT");
  if (perspective === "SUPPLIER" && !isPlatform(actor)) assertPermission(actor, "CREATE_QUOTE");
  if (perspective === "OPS") assertPermission(actor, "MANAGE_MATCHES");
  const db = getDb();
  const requirements = await db.select({
    id: buyerRequirements.id, buyerOrganizationId: buyerRequirements.buyerOrganizationId, buyer: organizations.name,
    quantity: buyerRequirements.quantity, quantityUnit: buyerRequirements.quantityUnit, destination: buyerRequirements.destination,
    notes: buyerRequirements.notes, createdAt: buyerRequirements.createdAt, product: productTypes.name,
    profileName: complianceProfiles.name, profileVersion: complianceProfileVersions.version,
  }).from(buyerRequirements)
    .innerJoin(organizations, eq(organizations.id, buyerRequirements.buyerOrganizationId))
    .innerJoin(productTypes, eq(productTypes.id, buyerRequirements.productTypeId))
    .innerJoin(complianceProfileVersions, eq(complianceProfileVersions.id, buyerRequirements.profileVersionId))
    .innerJoin(complianceProfiles, eq(complianceProfiles.id, complianceProfileVersions.profileId))
    .where(perspective === "BUYER" && !isPlatform(actor) ? eq(buyerRequirements.buyerOrganizationId, actor.organizationId) : undefined)
    .orderBy(desc(buyerRequirements.createdAt));

  const matches = await db.select({
    id: requirementMatches.id, requirementId: requirementMatches.buyerRequirementId, listingId: requirementMatches.marketplaceListingId,
    status: requirementMatches.status, matchedAt: requirementMatches.matchedAt, invalidatedAt: requirementMatches.invalidatedAt,
    invalidationReason: requirementMatches.invalidationReason, lotCode: physicalLots.supplierLotCode,
    supplierOrganizationId: physicalLots.supplierOrganizationId, supplier: organizations.name,
    quantity: physicalLots.quantity, quantityUnit: physicalLots.quantityUnit, location: physicalLots.locationName,
    countryCode: physicalLots.countryCode, listingStatus: marketplaceListings.status, publicSlug: marketplaceListings.publicSlug,
    profileVersion: complianceProfileVersions.version,
  }).from(requirementMatches)
    .innerJoin(marketplaceListings, eq(marketplaceListings.id, requirementMatches.marketplaceListingId))
    .innerJoin(physicalLots, eq(physicalLots.id, marketplaceListings.physicalLotId))
    .innerJoin(organizations, eq(organizations.id, physicalLots.supplierOrganizationId))
    .innerJoin(complianceProfileVersions, eq(complianceProfileVersions.id, requirementMatches.profileVersionId))
    .where(perspective === "SUPPLIER" && !isPlatform(actor) ? eq(physicalLots.supplierOrganizationId, actor.organizationId) : undefined)
    .orderBy(desc(requirementMatches.matchedAt));

  const visibleRequirementIds = new Set(requirements.map(({ id }) => id));
  const visibleMatches = perspective === "BUYER" && !isPlatform(actor) ? matches.filter((match) => visibleRequirementIds.has(match.requirementId)) : matches;
  const supplierRequirementIds = new Set(visibleMatches.map(({ requirementId }) => requirementId));
  const visibleRequirements = perspective === "SUPPLIER" && !isPlatform(actor)
    ? requirements.filter((requirement) => supplierRequirementIds.has(requirement.id))
    : requirements;
  const visibleMatchIds = visibleMatches.map(({ id }) => id);
  const quotes = visibleMatchIds.length ? await db.select().from(supplierQuotes).where(inArray(supplierQuotes.requirementMatchId, visibleMatchIds)).orderBy(desc(supplierQuotes.createdAt)) : [];
  const reservations = visibleMatchIds.length ? await db.select().from(reservationIntents).where(inArray(reservationIntents.requirementMatchId, visibleMatchIds)).orderBy(desc(reservationIntents.createdAt)) : [];
  return { requirements: visibleRequirements, matches: visibleMatches, quotes, reservations };
}
