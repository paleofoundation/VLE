import { ANALYTES, CATEGORIES, DOCUMENT_TYPES, type ListingFilters } from "./public-listings";
export type SearchValues = Record<string, string | string[] | undefined>;
export function listingFilters(params: SearchValues): ListingFilters {
  const one = (key: string) => typeof params[key] === "string" ? params[key] as string : undefined;
  const allowed = (key: string, values: readonly string[]) => { const v = one(key); return v && values.includes(v) ? v : undefined; };
  const months = Number(one("months"));
  return { q: one("q")?.trim().slice(0, 100), category: allowed("category", CATEGORIES), analyte: allowed("analyte", ANALYTES), country: one("country")?.slice(0, 150), months: [6, 12, 24].includes(months) ? months : undefined, listingSource: allowed("status", ["MEMBER", "PUBLIC_DOCUMENTS"]), docType: allowed("type", DOCUMENT_TYPES), supplier: one("supplier")?.slice(0, 150) };
}
