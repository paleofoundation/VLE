import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { supplierProfiles, supplierProducts, supplierLots, supplierSamplingRequests, physicalLots, productTypes, samplingOrders, publicDocuments, samples, tecridEvidence, qualificationDecisions, reservationIntents, marketplaceListings } from "@/db/schema";
import type { Actor } from "@/domain/authz";
import { supplierProfileSchema, supplierProductSchema, supplierLotSchema, supplierDocumentSchema, inventoryIsComplete } from "@/domain/supplier-self-listing";
import type { LotProgress } from "@/domain/public-listings";
import { ownSupplierProfile } from "./certifications";
import { appendAuditEvent } from "./audit";
export async function saveSupplierProfile(actor: Actor, input: unknown) {
  const profile = await ownSupplierProfile(actor); const data = supplierProfileSchema.parse(input);
  if ((profile.publishedAt || profile.listingSource === "PUBLIC_DOCUMENTS") && data.slug !== profile.slug) throw new Error("A published profile keeps its existing URL");
  await getDb().transaction(async (tx) => {
    await tx.update(supplierProfiles).set(data).where(and(eq(supplierProfiles.id, profile.id), eq(supplierProfiles.organizationId, actor.organizationId)));
    await appendAuditEvent(tx, actor, { eventType: "SUPPLIER_PROFILE_SAVED", entityType: "supplier_profile", entityId: profile.id, data });
  });
}
export async function publishSupplierProfile(actor: Actor, publish: boolean) {
  const p = await ownSupplierProfile(actor);
  if (publish && p.moderationHidden) throw new Error("Operations has hidden this listing. Contact marcus@vle.exchange before republishing.");
  if (publish) supplierProfileSchema.parse({ ...p, about: p.about ?? "" });
  await getDb().transaction(async (tx) => {
    await tx.update(supplierProfiles).set({ hidden: !publish, ...(publish ? { listingSource: "MEMBER" as const, publishedAt: p.publishedAt ?? new Date() } : {}) }).where(eq(supplierProfiles.id, p.id));
    await appendAuditEvent(tx, actor, { eventType: publish ? "SUPPLIER_PROFILE_PUBLISHED" : "SUPPLIER_PROFILE_UNPUBLISHED", entityType: "supplier_profile", entityId: p.id, data: { publish } });
  });
  return p.slug;
}
export async function saveSupplierProduct(actor: Actor, input: unknown) {
  const p = await ownSupplierProfile(actor); const { id, ...data } = supplierProductSchema.parse(input);
  await getDb().transaction(async (tx) => {
    const [row] = id ? await tx.update(supplierProducts).set(data).where(and(eq(supplierProducts.id, id), eq(supplierProducts.supplierProfileId, p.id))).returning() : await tx.insert(supplierProducts).values({ ...data, supplierProfileId: p.id }).returning();
    if (!row) throw new Error("Product does not belong to your company");
    await appendAuditEvent(tx, actor, { eventType: "SUPPLIER_PRODUCT_SAVED", entityType: "supplier_product", entityId: row.id, data });
  });
}
export async function saveSupplierLot(actor: Actor, input: unknown) {
  const p = await ownSupplierProfile(actor); const { id, ...data } = supplierLotSchema.parse(input);
  await getDb().transaction(async (tx) => {
    const product = await tx.query.supplierProducts.findFirst({ where: and(eq(supplierProducts.id, data.productId), eq(supplierProducts.supplierProfileId, p.id)) });
    if (!product) throw new Error("Product does not belong to your company");
    if (id) await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${id}))`);
    const current = id ? await tx.query.supplierLots.findFirst({ where: and(eq(supplierLots.id, id), eq(supplierLots.supplierProfileId, p.id)) }) : null;
    if (id && (!current || current.physicalLotId)) throw new Error("A lot in sampling cannot be edited here");
    const [row] = id ? await tx.update(supplierLots).set(data).where(and(eq(supplierLots.id, id), eq(supplierLots.supplierProfileId, p.id))).returning() : await tx.insert(supplierLots).values({ ...data, supplierProfileId: p.id }).returning();
    await appendAuditEvent(tx, actor, { eventType: "SUPPLIER_LOT_SAVED", entityType: "supplier_lot", entityId: row.id, data });
  });
}
export async function addSupplierDocument(actor: Actor, input: unknown) {
  const p = await ownSupplierProfile(actor); const data = supplierDocumentSchema.parse(input);
  await getDb().transaction(async (tx) => {
    const product = await tx.query.supplierProducts.findFirst({ where: and(eq(supplierProducts.id, data.productId), eq(supplierProducts.supplierProfileId, p.id)) });
    if (!product) throw new Error("Product does not belong to your company");
    const lot = data.supplierLotId ? await tx.query.supplierLots.findFirst({ where: and(eq(supplierLots.id, data.supplierLotId), eq(supplierLots.productId, product.id), eq(supplierLots.supplierProfileId, p.id)) }) : null;
    if (data.supplierLotId && !lot) throw new Error("Lot does not belong to this product");
    const websiteDomain = new URL(p.website!).hostname.replace(/^www\./, "");
    const sourceDomain = new URL(data.sourceUrl).hostname;
    if (sourceDomain.replace(/^www\./, "") !== websiteDomain && (!data.sourcePageUrl || new URL(data.sourcePageUrl).hostname.replace(/^www\./, "") !== websiteDomain)) throw new Error("For externally hosted files, link the supplier page that publishes the original");
    const [row] = await tx.insert(publicDocuments).values({ supplierProfileId: p.id, supplierReported: true, productName: product.name, lotOrBatch: lot?.supplierLotCode ?? null, docType: data.docType, testsText: data.testsText, analytes: data.analytes, labName: data.labName, labAccreditationAsStated: data.labAccreditationAsStated, reportDate: data.reportDate, sourceUrl: data.sourceUrl, sourceDomain, sourcePageUrl: data.sourcePageUrl, foundAt: new Date().toISOString().slice(0, 10) }).returning();
    await appendAuditEvent(tx, actor, { eventType: "SUPPLIER_DOCUMENT_ADDED", entityType: "public_document", entityId: row.id, data: { sourceUrl: data.sourceUrl } });
  });
}
export async function requestSupplierSampling(actor: Actor, lotId: string) {
  const p = await ownSupplierProfile(actor);
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lotId}))`);
    const lot = await tx.query.supplierLots.findFirst({ where: and(eq(supplierLots.id, lotId), eq(supplierLots.supplierProfileId, p.id)) });
    if (!lot) throw new Error("Lot does not belong to your company");
    const existing = await tx.query.supplierSamplingRequests.findFirst({ where: eq(supplierSamplingRequests.supplierLotId, lotId) });
    if (existing?.samplingOrderId) return existing;
    let samplingOrderId: string | null = null;
    if (inventoryIsComplete(lot)) {
      const product = await tx.query.supplierProducts.findFirst({ where: eq(supplierProducts.id, lot.productId) });
      if (!product) throw new Error("Product not found");
      const [type] = await tx.insert(productTypes).values({ code: `SUPPLIER_${product.id.replaceAll("-", "")}`, name: product.ingredient }).onConflictDoUpdate({ target: productTypes.code, set: { name: product.ingredient } }).returning();
      const [physical] = await tx.insert(physicalLots).values({ supplierOrganizationId: actor.organizationId, productTypeId: type.id, supplierLotCode: lot.supplierLotCode, quantity: lot.quantity!, quantityUnit: lot.quantityUnit!, locationName: lot.locationName!, countryCode: lot.countryCode!, ownerName: lot.ownerName!, status: "SAMPLING" }).returning();
      const [order] = await tx.insert(samplingOrders).values({ physicalLotId: physical.id, requestedByOrganizationId: actor.organizationId, status: "REQUESTED" }).returning();
      samplingOrderId = order.id;
      await tx.update(supplierLots).set({ physicalLotId: physical.id }).where(eq(supplierLots.id, lotId));
    }
    const [request] = await tx.insert(supplierSamplingRequests).values({ supplierLotId: lotId, supplierProfileId: p.id, samplingOrderId }).onConflictDoUpdate({ target: supplierSamplingRequests.supplierLotId, set: { samplingOrderId } }).returning();
    await appendAuditEvent(tx, actor, { eventType: "SUPPLIER_TECRID_REQUESTED", entityType: "supplier_sampling_request", entityId: request.id, data: { lotId, samplingOrderId, inventoryComplete: inventoryIsComplete(lot) } });
    return request;
  });
}
export async function publicSupplierProducts(profileId: string) { return getDb().select().from(supplierProducts).where(eq(supplierProducts.supplierProfileId, profileId)); }
export async function publicSupplierLots(profileId: string) {
  const db = getDb(); const lots = await db.select({ id: supplierLots.id, productId: supplierLots.productId, supplierLotCode: supplierLots.supplierLotCode, quantity: supplierLots.quantity, quantityUnit: supplierLots.quantityUnit, physicalLotId: supplierLots.physicalLotId }).from(supplierLots).where(eq(supplierLots.supplierProfileId, profileId));
  return Promise.all(lots.map(async (lot) => {
    const records: LotProgress = {};
    if (!lot.physicalLotId) return { ...lot, status: null, records };
    const physical = await db.query.physicalLots.findFirst({ where: eq(physicalLots.id, lot.physicalLotId) });
    if (physical?.identityConfirmedAt) records.Lot = physical.id;
    const sample = await db.query.samples.findFirst({ where: eq(samples.physicalLotId, lot.physicalLotId) });
    if (sample) records.Sample = sample.id;
    const evidence = sample ? await db.query.tecridEvidence.findMany({ where: eq(tecridEvidence.sampleId, sample.id) }) : [];
    const current = evidence.find((e) => e.status === "CURRENT" && e.expiresAt > new Date());
    if (current) records.TECRID = current.id;
    const decision = current ? await db.query.qualificationDecisions.findFirst({ where: and(eq(qualificationDecisions.evidenceId, current.id), eq(qualificationDecisions.outcome, "QUALIFIED")) }) : null;
    if (physical?.status === "QUALIFIED" && decision) records.QUALIFIED = decision.id;
    const listing = records.QUALIFIED ? await db.query.marketplaceListings.findFirst({ where: and(eq(marketplaceListings.physicalLotId, lot.physicalLotId), eq(marketplaceListings.status, "LISTED")) }) : null;
    const reserved = listing ? await db.query.reservationIntents.findFirst({ where: and(eq(reservationIntents.marketplaceListingId, listing.id), eq(reservationIntents.status, "ACTIVE")) }) : null;
    if (reserved && reserved.expiresAt > new Date()) records.Reserved = reserved.id;
    return { ...lot, status: physical?.status ?? null, records };
  }));
}
