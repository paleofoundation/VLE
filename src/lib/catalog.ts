import seed from "@/content/seed/suppliers.json";

export type Result = { analyte: string; value: string; unit?: string; meaning: string; method?: string; labLimit?: string };
export type Document = { id: string; title: string; product: string; productSlug?: string; url: string; publisherDomain: string; sourcePage?: string | null; reportDate: string; dateIso?: string | null; foundAt: string; lab?: string | null; analytes: string[]; results: Result[]; lotCode?: string };
export type Product = { slug: string; name: string; ingredient?: string; form?: string; origin?: string; url?: string };
export type Certificate = { name: string; status: string; description?: string; url?: string; date?: string; statusNote?: string };
export type Supplier = { slug: string; name: string; legalName: string; country: string; category: string; website: string; domain: string; summary: string; status: string; updatedAt: string; products: Product[]; documents: Document[]; certifications: Certificate[]; latestReportDate: string | null };
export const suppliers: Supplier[] = seed;
export const categories = [{ slug: "olive-oil", label: "Olive oil" }, { slug: "cocoa", label: "Cocoa" }, { slug: "protein", label: "Protein" }, { slug: "spices", label: "Spices" }, { slug: "tea-and-matcha", label: "Tea and matcha" }, { slug: "rice", label: "Rice" }];
export const categoryName = (slug: string) => categories.find(c => c.slug === slug)?.label ?? slug;
export const findSupplier = (slug: string) => suppliers.find(s => s.slug === slug);
export const documents = suppliers.flatMap(s => s.documents.map(d => ({ ...d, supplierSlug: s.slug, supplierName: s.name, category: s.category })));
export function dateLabel(date: string) { return /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : date; }
export function sourceNotice(doc: Document) { return `Published by the supplier on ${doc.publisherDomain}, ${dateLabel(doc.foundAt)}. Not a VLE-verified result.`; }
export function isStale(updated: string, now = new Date()) { const anniversary = new Date(`${updated}T00:00:00Z`); anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1); return now >= anniversary; }
export type Filters = { q?: string; category?: string; analyte?: string; country?: string; months?: string; status?: string; hasPrice?: string; certification?: string; result?: string };
export function parseSearch(q: string): Filters {
  const lower = q.toLowerCase(); const filters: Filters = {};
  const aliases: Record<string, string[]> = { "olive-oil": ["olive oil", "evoo"], cocoa: ["cocoa", "cacao"], protein: ["protein", "whey"], spices: ["spice", "cinnamon", "turmeric"], "tea-and-matcha": ["matcha", "tea"], rice: ["rice"] };
  for (const [category, terms] of Object.entries(aliases)) if (terms.some(t => new RegExp(`\\b${t}\\b`).test(lower))) { filters.category = category; break; }
  for (const analyte of ["lead", "arsenic", "cadmium", "mercury", "nickel", "aluminum", "pesticides", "glyphosate", "phthalates"]) if (lower.includes(analyte)) { filters.analyte = analyte; break; }
  for (const country of ["Japan", "Greece", "India", "Poland", "Germany", "Australia", "USA"]) if (lower.includes(country.toLowerCase())) filters.country = country;
  if (/not detected|\bnd\b/.test(lower)) filters.result = "nd";
  for (const cert of ["paleo", "keto", "organic", "kosher", "non-gmo"]) if (lower.includes(cert)) filters.certification = cert;
  return filters;
}
export function filterSuppliers(filters: Filters, now = new Date()) {
  const parsed = parseSearch(filters.q ?? ""); const f = { ...parsed, ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) } as Filters;
  const hasParsed = Object.keys(parsed).length > 0;
  return suppliers.filter(s => {
    if (f.category && s.category !== f.category) return false;
    if (f.status && s.status !== f.status) return false;
    if (f.hasPrice === "yes") return false; // No price is published in the seed evidence.
    if (f.country && ![s.country, ...s.products.map(p => p.origin ?? "")].join(" ").toLowerCase().includes(f.country.toLowerCase())) return false;
    if (f.certification && !s.certifications.some(c => `${c.name} ${c.description ?? ""}`.toLowerCase().includes(f.certification!.toLowerCase()))) return false;
    // All document predicates apply to the same document, not unrelated reports.
    if ((f.analyte || f.months || f.result) && !s.documents.some(d => {
      if (f.analyte && !d.analytes.includes(f.analyte)) return false;
      if (f.months) { const cutoff = new Date(now); cutoff.setUTCMonth(cutoff.getUTCMonth() - Number(f.months)); if (!d.dateIso || new Date(d.dateIso) < cutoff) return false; }
      if (f.result === "nd" && !d.results.some(r => r.value === "ND" && (!f.analyte || r.analyte.toLowerCase() === f.analyte))) return false;
      return true;
    })) return false;
    if (f.q && !hasParsed && !`${s.name} ${s.legalName} ${s.summary} ${s.products.map(p => p.name).join(" ")}`.toLowerCase().includes(f.q.toLowerCase())) return false;
    return true;
  });
}
export function filtersPath(filters: Filters) {
  const segments = Object.entries(filters).filter(([key, value]) => key !== "q" && value).flatMap(([key, value]) => [key, encodeURIComponent(value!)]);
  return `/suppliers${segments.length ? `/filter/${segments.join("/")}` : ""}${filters.q ? `?q=${encodeURIComponent(filters.q)}` : ""}`;
}
