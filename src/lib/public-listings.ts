import "server-only";
import { and, or, eq, getTableColumns } from "drizzle-orm";
import { getDb } from "@/db";
import { publicDocuments, supplierProfiles, supplierProducts } from "@/db/schema";
import { matchesDocument } from "@/domain/listing-filters";
import type { ListingFilters } from "@/domain/public-listings";

// Exclude the internal provenance note at query time, not only at render time.
const { verificationNote: internalNote, ...documentColumns } = getTableColumns(publicDocuments);
void internalNote;
export async function listDocuments(filters: ListingFilters = {}) {
  const rows = await getDb().select({ document: documentColumns, supplier: getTableColumns(supplierProfiles) }).from(publicDocuments)
    .innerJoin(supplierProfiles, eq(publicDocuments.supplierProfileId, supplierProfiles.id))
    .where(and(eq(supplierProfiles.hidden, false), or(eq(publicDocuments.supplierReported, false), eq(supplierProfiles.listingSource, "MEMBER")), filters.includeUnavailable ? undefined : eq(publicDocuments.linkState, "LIVE")));
  return rows.filter(({ document, supplier }) => matchesDocument(document, supplier, filters)).sort((a, b) => (b.document.reportDate ?? "").localeCompare(a.document.reportDate ?? "") || a.supplier.displayName.localeCompare(b.supplier.displayName));
}
export async function listSuppliers(filters: ListingFilters = {}) {
  const [profiles, documents, products] = await Promise.all([
    getDb().select().from(supplierProfiles).where(eq(supplierProfiles.hidden, false)), listDocuments(filters), getDb().select().from(supplierProducts),
  ]);
  return profiles.filter((s) => (!filters.category || s.categories.includes(filters.category)) && (!filters.country || s.country === filters.country) && (!filters.listingSource || s.listingSource === filters.listingSource) && (!filters.q || s.displayName.toLowerCase().includes(filters.q.toLowerCase())) &&
    (!(filters.analyte || filters.months || filters.docType) || documents.some((d) => d.supplier.id === s.id)))
    .map((s) => { const docs = documents.filter((d) => d.supplier.id === s.id).map((d) => d.document); return { ...s, documents: docs, productCount: new Set([...docs.map((d) => d.productName).filter(Boolean), ...products.filter((p) => s.listingSource === "MEMBER" && p.supplierProfileId === s.id).map((p) => p.name)]).size, documentCount: docs.length, latestReportDate: docs.map((d) => d.reportDate).filter((d): d is string => !!d).sort().at(-1) ?? null }; })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
export async function getSupplier(slug: string) {
  return (await listSuppliers()).find((s) => s.slug === slug) ?? null;
}
