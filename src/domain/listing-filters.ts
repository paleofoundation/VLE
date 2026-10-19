import { ANALYTES, CATEGORIES, DOCUMENT_TYPES, type ListingFilters } from "./public-listings";
export type SearchValues = Record<string, string | string[] | undefined>;
export function listingFilters(params: SearchValues): ListingFilters {
  const one = (key: string) => typeof params[key] === "string" ? params[key] as string : undefined;
  const allowed = (key: string, values: readonly string[]) => { const v = one(key); return v && values.includes(v) ? v : undefined; };
  const months = Number(one("months"));
  return { q: one("q")?.trim().slice(0, 100), category: allowed("category", CATEGORIES), analyte: allowed("analyte", ANALYTES), country: one("country")?.slice(0, 150), months: [6, 12, 24].includes(months) ? months : undefined, listingSource: allowed("status", ["MEMBER", "PUBLIC_DOCUMENTS"]), docType: allowed("type", DOCUMENT_TYPES), supplier: one("supplier")?.slice(0, 150), lab: one("lab")?.slice(0, 200), from: /^\d{4}-\d{2}-\d{2}$/.test(one("from") ?? "") ? one("from") : undefined, to: /^\d{4}-\d{2}-\d{2}$/.test(one("to") ?? "") ? one("to") : undefined };
}

export function matchesDocument(d: { reportDate: string | null; docType: string; analytes: string[]; productName: string | null; testsText: string | null; labName: string | null }, s: { displayName: string; categories: string[]; country: string | null; slug: string; listingSource: string }, f: ListingFilters, now = new Date()) {
  const cutoff = new Date(now); if (f.months) cutoff.setUTCMonth(cutoff.getUTCMonth() - f.months);
  return (!f.category || s.categories.includes(f.category)) && (!f.country || s.country === f.country) &&
    (!f.analyte || d.analytes.includes(f.analyte)) && (!f.docType || d.docType === f.docType) &&
    (!f.supplier || s.slug === f.supplier) && (!f.listingSource || s.listingSource === f.listingSource) &&
    (!f.months || !!d.reportDate && new Date(d.reportDate) >= cutoff) &&
    (!f.lab || d.labName === f.lab) && (!f.from || !!d.reportDate && d.reportDate >= f.from) && (!f.to || !!d.reportDate && d.reportDate <= f.to) &&
    (!f.q || `${s.displayName} ${d.productName ?? ""} ${d.testsText ?? ""}`.toLowerCase().includes(f.q.toLowerCase()));
}
