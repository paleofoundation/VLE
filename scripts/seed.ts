import { createHash } from "node:crypto";
import { and, desc, eq, like } from "drizzle-orm";
import { getDb } from "../src/db";
import {
  auditEvents, buyerRequirements, complianceProfiles, complianceProfileVersions, marketplaceListings, memberships,
  organizations, physicalLots, productTypes, qualificationDecisions, requirementMatches, reservationIntents,
  samples, samplingOrders, supplierQuotes, tecridEvidence, users,
} from "../src/db/schema";
import { qualify } from "../src/domain/qualification";
import type { LimitRule, ResultValue } from "../src/domain/types";

const ids = {
  platformOrg: "00000000-0000-4000-8000-000000000001", supplierOrg: "00000000-0000-4000-8000-000000000002", buyerOrg: "00000000-0000-4000-8000-000000000003",
  opsUser: "00000000-0000-4000-8000-000000000011", adminUser: "00000000-0000-4000-8000-000000000012", supplierUser: "00000000-0000-4000-8000-000000000013", buyerUser: "00000000-0000-4000-8000-000000000014",
  cocoa: "00000000-0000-4000-8000-000000000021", profile: "00000000-0000-4000-8000-000000000022", profileV1: "00000000-0000-4000-8000-000000000023",
  passedLot: "00000000-0000-4000-8000-000000000031", failedLot: "00000000-0000-4000-8000-000000000032", demoLot: "00000000-0000-4000-8000-000000000033",
  passedOrder: "00000000-0000-4000-8000-000000000041", failedOrder: "00000000-0000-4000-8000-000000000042",
  passedSample: "00000000-0000-4000-8000-000000000051", failedSample: "00000000-0000-4000-8000-000000000052",
  passedEvidence: "00000000-0000-4000-8000-000000000061", failedEvidence: "00000000-0000-4000-8000-000000000062",
  passedDecision: "00000000-0000-4000-8000-000000000071", failedDecision: "00000000-0000-4000-8000-000000000072", listing: "00000000-0000-4000-8000-000000000081",
  requirement: "00000000-0000-4000-8000-000000000101", match: "00000000-0000-4000-8000-000000000102",
  quote: "00000000-0000-4000-8000-000000000103", reservation: "00000000-0000-4000-8000-000000000104",
};

const rules: LimitRule[] = [
  { analyte: "lead", maxPpm: 0.5 }, { analyte: "cadmium", maxPpm: 0.8 },
  { analyte: "arsenic", maxPpm: 0.3 }, { analyte: "mercury", maxPpm: 0.05 },
];
const passedResults: ResultValue[] = [
  { analyte: "lead", valuePpm: 0.15, unit: "ppm" }, { analyte: "cadmium", valuePpm: 0.45, unit: "ppm" },
  { analyte: "arsenic", valuePpm: 0.1, unit: "ppm" }, { analyte: "mercury", valuePpm: 0.01, unit: "ppm" },
];
const failedResults: ResultValue[] = passedResults.map((result) => result.analyte === "cadmium" ? { ...result, valuePpm: 1.2 } : result);
const issuedAt = new Date("2026-01-15T12:00:00Z"); const expiresAt = new Date("2030-01-15T12:00:00Z"); const decidedAt = new Date("2026-01-16T12:00:00Z");

async function seed() {
  const db = getDb();
  await db.insert(organizations).values([
    { id: ids.platformOrg, name: "VLE Managed Operations", slug: "vle-ops", kind: "PLATFORM" },
    { id: ids.supplierOrg, name: "Demo Cocoa Cooperative", slug: "demo-cocoa-coop", kind: "SUPPLIER" },
    { id: ids.buyerOrg, name: "Demo Ingredient Buyer", slug: "demo-buyer", kind: "BUYER" },
  ]).onConflictDoNothing();
  await db.insert(users).values([
    { id: ids.opsUser, clerkUserId: "seed_ops_replace_with_clerk_id", email: "ops@vle.exchange", displayName: "VLE Ops" },
    { id: ids.adminUser, clerkUserId: "seed_admin_replace_with_clerk_id", email: "admin@vle.exchange", displayName: "VLE Admin" },
    { id: ids.supplierUser, clerkUserId: "seed_supplier_replace_with_clerk_id", email: "supplier@example.test", displayName: "Demo Supplier" },
    { id: ids.buyerUser, clerkUserId: "seed_buyer_replace_with_clerk_id", email: "buyer@example.test", displayName: "Demo Buyer" },
  ]).onConflictDoNothing();
  await db.insert(memberships).values([
    { userId: ids.opsUser, organizationId: ids.platformOrg, role: "OPS" }, { userId: ids.adminUser, organizationId: ids.platformOrg, role: "ADMIN" },
    { userId: ids.supplierUser, organizationId: ids.supplierOrg, role: "SUPPLIER" }, { userId: ids.buyerUser, organizationId: ids.buyerOrg, role: "BUYER" },
  ]).onConflictDoNothing();
  await db.insert(productTypes).values({ id: ids.cocoa, code: "COCOA_POWDER", name: "Cocoa powder" }).onConflictDoNothing();
  await db.insert(complianceProfiles).values({ id: ids.profile, productTypeId: ids.cocoa, name: "Cocoa Profile" }).onConflictDoNothing();
  await db.insert(complianceProfileVersions).values({ id: ids.profileV1, profileId: ids.profile, version: "1.0", status: "FROZEN", rules, notes: "EXAMPLE LIMITS ONLY — not a regulatory or safety standard. Replace through a new version; never edit this frozen version.", frozenAt: issuedAt, createdByUserId: ids.adminUser }).onConflictDoNothing();
  await db.insert(physicalLots).values([
    { id: ids.passedLot, supplierOrganizationId: ids.supplierOrg, productTypeId: ids.cocoa, supplierLotCode: "COCOA-EC-2026-014", status: "QUALIFIED", quantity: "12000", quantityUnit: "kg", locationName: "Guayaquil warehouse", countryCode: "EC", ownerName: "Demo Cocoa Cooperative", identityConfirmedAt: issuedAt, quantityVerifiedAt: issuedAt, locationVerifiedAt: issuedAt, authorityToSellVerifiedAt: issuedAt },
    { id: ids.failedLot, supplierOrganizationId: ids.supplierOrg, productTypeId: ids.cocoa, supplierLotCode: "COCOA-EC-2026-015", status: "NOT_QUALIFIED", quantity: "9000", quantityUnit: "kg", locationName: "Guayaquil warehouse", countryCode: "EC", ownerName: "Demo Cocoa Cooperative", identityConfirmedAt: issuedAt, quantityVerifiedAt: issuedAt, locationVerifiedAt: issuedAt, authorityToSellVerifiedAt: issuedAt },
    { id: ids.demoLot, supplierOrganizationId: ids.supplierOrg, productTypeId: ids.cocoa, supplierLotCode: "COCOA-DEMO-NOMINATED", status: "NOMINATED", quantity: "5000", quantityUnit: "kg", locationName: "Demo origin warehouse", countryCode: "EC", ownerName: "Demo Cocoa Cooperative" },
  ]).onConflictDoNothing();
  const [openDemo] = await db.select({ id: physicalLots.id }).from(physicalLots).where(and(eq(physicalLots.status, "NOMINATED"), like(physicalLots.supplierLotCode, "COCOA-DEMO-NOMINATED%"))).limit(1);
  if (!openDemo) {
    await db.insert(physicalLots).values({ supplierOrganizationId: ids.supplierOrg, productTypeId: ids.cocoa, supplierLotCode: `COCOA-DEMO-NOMINATED-${Date.now()}`, status: "NOMINATED", quantity: "5000", quantityUnit: "kg", locationName: "Demo origin warehouse", countryCode: "EC", ownerName: "Demo Cocoa Cooperative" });
  }
  await db.insert(samplingOrders).values([
    { id: ids.passedOrder, physicalLotId: ids.passedLot, requestedByOrganizationId: ids.platformOrg, status: "COMPLETED", assignedSampler: "Independent sampler" },
    { id: ids.failedOrder, physicalLotId: ids.failedLot, requestedByOrganizationId: ids.platformOrg, status: "COMPLETED", assignedSampler: "Independent sampler" },
  ]).onConflictDoNothing();
  await db.insert(samples).values([
    { id: ids.passedSample, samplingOrderId: ids.passedOrder, physicalLotId: ids.passedLot, sampleCode: "SAMPLE-COCOA-014", sampledAt: issuedAt, samplerName: "Independent sampler", method: "EXAMPLE cocoa composite sampling SOP v0.1", sealIdentifiers: ["SEAL-014-A"], chainOfCustody: [{ event: "COLLECTED", at: issuedAt.toISOString() }, { event: "RECEIVED", at: issuedAt.toISOString() }] },
    { id: ids.failedSample, samplingOrderId: ids.failedOrder, physicalLotId: ids.failedLot, sampleCode: "SAMPLE-COCOA-015", sampledAt: issuedAt, samplerName: "Independent sampler", method: "EXAMPLE cocoa composite sampling SOP v0.1", sealIdentifiers: ["SEAL-015-A"], chainOfCustody: [{ event: "COLLECTED", at: issuedAt.toISOString() }, { event: "RECEIVED", at: issuedAt.toISOString() }] },
  ]).onConflictDoNothing();
  await db.insert(tecridEvidence).values([
    { id: ids.passedEvidence, sampleId: ids.passedSample, tecridId: "TECRID-MOCK-PASS-014", issuer: "VLE_LOCAL_MOCK_ISSUER", issuedAt, expiresAt, results: passedResults, payloadHash: createHash("sha256").update(JSON.stringify(passedResults)).digest("hex"), verifiedAt: issuedAt },
    { id: ids.failedEvidence, sampleId: ids.failedSample, tecridId: "TECRID-MOCK-FAIL-015", issuer: "VLE_LOCAL_MOCK_ISSUER", issuedAt, expiresAt, results: failedResults, payloadHash: createHash("sha256").update(JSON.stringify(failedResults)).digest("hex"), verifiedAt: issuedAt },
  ]).onConflictDoNothing();
  const profile = { id: ids.profileV1, version: "1.0", status: "FROZEN" as const, rules };
  const passed = qualify(profile, { id: ids.passedEvidence, status: "CURRENT", issuedAt, expiresAt, results: passedResults }, decidedAt);
  const failed = qualify(profile, { id: ids.failedEvidence, status: "CURRENT", issuedAt, expiresAt, results: failedResults }, decidedAt);
  await db.insert(qualificationDecisions).values([
    { id: ids.passedDecision, physicalLotId: ids.passedLot, sampleId: ids.passedSample, evidenceId: ids.passedEvidence, profileVersionId: ids.profileV1, outcome: passed.outcome, rationale: passed.rationale, engineVersion: "vle-deterministic-1", inputHash: passed.inputHash, decidedAt, decidedByUserId: ids.opsUser },
    { id: ids.failedDecision, physicalLotId: ids.failedLot, sampleId: ids.failedSample, evidenceId: ids.failedEvidence, profileVersionId: ids.profileV1, outcome: failed.outcome, rationale: failed.rationale, engineVersion: "vle-deterministic-1", inputHash: failed.inputHash, decidedAt, decidedByUserId: ids.opsUser },
  ]).onConflictDoNothing();
  await db.insert(marketplaceListings).values({ id: ids.listing, physicalLotId: ids.passedLot, qualificationDecisionId: ids.passedDecision, status: "LISTED", publicSlug: "cocoa-ec-2026-014", publishedAt: decidedAt }).onConflictDoNothing();
  const commercialAt = new Date("2026-09-01T12:00:00Z");
  const quoteExpiresAt = new Date("2030-01-10T12:00:00Z");
  const reservationExpiresAt = new Date("2030-01-05T12:00:00Z");
  await db.insert(buyerRequirements).values({ id: ids.requirement, buyerOrganizationId: ids.buyerOrg, productTypeId: ids.cocoa, profileVersionId: ids.profileV1, quantity: "2000", quantityUnit: "kg", destination: "Rotterdam, NL", notes: "Phase B cocoa commercial-intent walkthrough" }).onConflictDoNothing();
  await db.insert(requirementMatches).values({ id: ids.match, buyerRequirementId: ids.requirement, marketplaceListingId: ids.listing, profileVersionId: ids.profileV1, matchedByUserId: ids.opsUser, matchedAt: commercialAt }).onConflictDoNothing();
  await db.insert(supplierQuotes).values({ id: ids.quote, requirementMatchId: ids.match, buyerOrganizationId: ids.buyerOrg, supplierOrganizationId: ids.supplierOrg, status: "DRAFT", quantity: "2000", quantityUnit: "kg", unitPrice: "4.2500", currency: "USD", terms: "EXAMPLE commercial terms only — freight and payment excluded", expiresAt: quoteExpiresAt, createdByUserId: ids.supplierUser }).onConflictDoNothing();
  const [seededQuote] = await db.select().from(supplierQuotes).where(eq(supplierQuotes.id, ids.quote)).limit(1);
  if (seededQuote?.status === "DRAFT") await db.update(supplierQuotes).set({ status: "SENT", sentAt: commercialAt }).where(eq(supplierQuotes.id, ids.quote));
  const [sentQuote] = await db.select().from(supplierQuotes).where(eq(supplierQuotes.id, ids.quote)).limit(1);
  if (sentQuote?.status === "SENT") await db.update(supplierQuotes).set({ status: "ACCEPTED", acceptedAt: commercialAt }).where(eq(supplierQuotes.id, ids.quote));
  await db.insert(reservationIntents).values({ id: ids.reservation, supplierQuoteId: ids.quote, requirementMatchId: ids.match, marketplaceListingId: ids.listing, buyerOrganizationId: ids.buyerOrg, supplierOrganizationId: ids.supplierOrg, status: "ACTIVE", expiresAt: reservationExpiresAt, createdByUserId: ids.buyerUser }).onConflictDoNothing();
  const seedEvents = [
    { id: "00000000-0000-4000-8000-000000000091", eventType: "QUALIFICATION_DECIDED", entityType: "QualificationDecision", entityId: ids.passedDecision, data: { outcome: passed.outcome } },
    { id: "00000000-0000-4000-8000-000000000092", eventType: "QUALIFICATION_DECIDED", entityType: "QualificationDecision", entityId: ids.failedDecision, data: { outcome: failed.outcome, private: true } },
    { id: "00000000-0000-4000-8000-000000000093", eventType: "LISTING_PUBLISHED", entityType: "MarketplaceListing", entityId: ids.listing, data: { claim: "Passed Cocoa Profile v1.0" } },
    { id: "00000000-0000-4000-8000-000000000094", eventType: "REQUIREMENT_MATCH_CREATED", entityType: "RequirementMatch", entityId: ids.match, data: { requirementId: ids.requirement, listingId: ids.listing, profileVersionId: ids.profileV1 } },
    { id: "00000000-0000-4000-8000-000000000095", eventType: "SUPPLIER_QUOTE_ACCEPTED", entityType: "SupplierQuote", entityId: ids.quote, data: { example: true, orderCreated: false } },
    { id: "00000000-0000-4000-8000-000000000096", eventType: "RESERVATION_INTENT_CREATED", entityType: "ReservationIntent", entityId: ids.reservation, data: { example: true, orderCreated: false } },
  ];
  const [latestAudit] = await db.select({ eventHash: auditEvents.eventHash }).from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(1);
  let previousHash = latestAudit?.eventHash;
  for (const [index, event] of seedEvents.entries()) {
    const eventHash = createHash("sha256").update(JSON.stringify({ ...event, previousHash })).digest("hex");
    await db.insert(auditEvents).values({ ...event, actorUserId: ids.opsUser, actorOrganizationId: ids.platformOrg, previousHash, eventHash, createdAt: new Date(decidedAt.getTime() + index) }).onConflictDoNothing();
    previousHash = eventHash;
  }
  console.log("VLE seed complete: Phase A truth spine plus requirement → match → accepted quote → active reservation intent.");
}

seed().catch((error) => { console.error(error); process.exit(1); });
