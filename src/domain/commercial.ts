import type { Actor } from "./authz";
import { DomainError } from "./errors";
import type { ReservationIntentStatus, SupplierQuoteStatus } from "./types";

export type MatchEligibilityFacts = {
  requirementProductCode: string;
  requirementProductTypeId: string;
  requirementProfileVersionId: string;
  requirementQuantity: number;
  requirementQuantityUnit: string;
  listingStatus: "LISTED" | "UNLISTED";
  listingProductTypeId: string;
  listingProfileVersionId: string;
  availableQuantity: number;
  availableQuantityUnit: string;
  decisionOutcome: "QUALIFIED" | "NOT_QUALIFIED" | "INSUFFICIENT_EVIDENCE";
  profileStatus: "DRAFT" | "FROZEN" | "RETIRED";
  evidenceStatus: "CURRENT" | "REVOKED";
  evidenceExpiresAt: Date;
  identityConfirmedAt: Date | null;
  quantityVerifiedAt: Date | null;
  locationVerifiedAt: Date | null;
  authorityToSellVerifiedAt: Date | null;
  heldAt: Date | null;
  revokedAt: Date | null;
  transformedAt: Date | null;
  depletedAt: Date | null;
};

export function isEligibleRequirementMatch(facts: MatchEligibilityFacts, now: Date) {
  return facts.requirementProductCode === "COCOA_POWDER"
    && facts.requirementProductTypeId === facts.listingProductTypeId
    && facts.requirementProfileVersionId === facts.listingProfileVersionId
    && facts.listingStatus === "LISTED"
    && facts.requirementQuantityUnit === facts.availableQuantityUnit
    && facts.availableQuantity >= facts.requirementQuantity
    && facts.decisionOutcome === "QUALIFIED"
    && facts.profileStatus === "FROZEN"
    && facts.evidenceStatus === "CURRENT"
    && facts.evidenceExpiresAt > now
    && !!facts.identityConfirmedAt
    && !!facts.quantityVerifiedAt
    && !!facts.locationVerifiedAt
    && !!facts.authorityToSellVerifiedAt
    && !facts.heldAt && !facts.revokedAt && !facts.transformedAt && !facts.depletedAt;
}

const quoteTransitions: Record<SupplierQuoteStatus, readonly SupplierQuoteStatus[]> = {
  DRAFT: ["SENT", "EXPIRED", "WITHDRAWN"],
  SENT: ["ACCEPTED", "EXPIRED", "WITHDRAWN"],
  ACCEPTED: [], EXPIRED: [], WITHDRAWN: [],
};

export function assertQuoteTransition(from: SupplierQuoteStatus, to: SupplierQuoteStatus, expiresAt: Date, now: Date) {
  if (!quoteTransitions[from].includes(to)) throw new DomainError(`Supplier quote cannot transition from ${from} to ${to}`, "INVALID_TRANSITION");
  if (to === "EXPIRED" && expiresAt > now) throw new DomainError("Supplier quote cannot expire before its expiry time", "INVALID_TRANSITION");
  if ((to === "SENT" || to === "ACCEPTED") && expiresAt <= now) throw new DomainError("Expired supplier quote cannot advance", "QUOTE_EXPIRED");
}

const reservationTransitions: Record<ReservationIntentStatus, readonly ReservationIntentStatus[]> = {
  ACTIVE: ["CANCELLED", "EXPIRED", "INVALIDATED"],
  CANCELLED: [], EXPIRED: [], INVALIDATED: [],
};

export function assertReservationTransition(from: ReservationIntentStatus, to: ReservationIntentStatus, expiresAt: Date, now: Date) {
  if (!reservationTransitions[from].includes(to)) throw new DomainError(`Reservation intent cannot transition from ${from} to ${to}`, "INVALID_TRANSITION");
  if (to === "EXPIRED" && expiresAt > now) throw new DomainError("Reservation intent cannot expire before its expiry time", "INVALID_TRANSITION");
}

export function statusAfterListingInvalidation(status: ReservationIntentStatus) {
  return status === "ACTIVE" ? "INVALIDATED" as const : status;
}

export function assertCommercialVisibility(actor: Actor, buyerOrganizationId: string, supplierOrganizationId: string) {
  if (actor.roles.some((role) => role === "OPS" || role === "ADMIN")) return;
  const isBuyerParty = actor.roles.includes("BUYER") && actor.organizationId === buyerOrganizationId;
  const isSupplierParty = actor.roles.includes("SUPPLIER") && actor.organizationId === supplierOrganizationId;
  if (isBuyerParty || isSupplierParty) return;
  throw new DomainError("Cross-organization commercial access denied", "TENANT_MISMATCH");
}
