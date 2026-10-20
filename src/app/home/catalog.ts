import {
  kasandrinosCertifications,
  kasandrinosProducts,
  kasandrinosReports,
  kasandrinosTransparencyUrl,
  supplierDocumentNotice,
} from "../../content/suppliers/kasandrinos";

/**
 * Homepage facts come from the Kasandrinos profile already in the repo.
 * Counts are list lengths. Prices and lab values are not present, so they are not shown.
 */

export const categories = [
  { id: "olive-oil", label: "Olive oil" },
  { id: "cocoa", label: "Cocoa" },
  { id: "protein", label: "Protein" },
  { id: "spices", label: "Spices" },
  { id: "tea-matcha", label: "Tea and matcha" },
  { id: "rice", label: "Rice" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export const copy = {
  kicker: "Verified Lot Exchange",
  titleFind: "Find",
  titleRest: "ingredient suppliers",
  titleEnd: "by what is in ",
  titleEm: "the lot.",
  lede: "Brands browse free. Suppliers list free. Documents stay visible.",
  searchLabel: "Search suppliers, ingredients or contaminants",
  searchButton: "Search",
  clear: "Clear search",
  suppliers: "Suppliers",
  oneListed: "1 supplier listed",
  noneListed: "No supplier listed",
  bannerBefore: "Listed from public documents. Not a VLE member. ",
  claim: "Claim this profile",
  bannerAfter: ".",
  origin: "Greece, Laconia. Organic extra virgin olive oil.",
  summary:
    "Family-grown organic extra virgin olive oil from Greece. From family farms in Laconia, Greece.",
  formatsLabel: "Formats",
  certificationsLabel: "Certifications",
  reportsLabel: "Reports",
  lotLabel: "VLE lot",
  lotValue: "Pending",
  formatsHeading: "Formats",
  certificationsHeading: "Certifications",
  certsNote: "Supplier-published certifications. These do not establish VLE lot qualification.",
  viewProfile: "View supplier profile",
  lotStatus: "Lot status",
  lotNote:
    "Each step stays Pending until its real record exists. Supplier-published reports do not advance this pipeline.",
  stepPending: "Pending",
  documents: "Latest documents",
  documentsMatch: "Documents",
  documentsLede: "Open the supplier's file. No sign-in.",
  documentsChecked: "Documents checked 19 October 2026.",
  openPdf: "Open PDF",
  allDocuments: "All documents on the Kasandrinos profile",
  emptyCategory: (label: string) => `No supplier is listed for ${label.toLowerCase()} yet.`,
  emptyCategoryNote: "Suppliers list free. No demo, no sales call.",
  emptySearch: "Nothing listed matches this search.",
  emptySearchNote: "Names are matched as published. A search does not invent a test result.",
  emptyDocuments: "No documents match.",
  forSuppliers: "For suppliers",
  listTitle: "List free today.",
  listNote: "No demo, no sales call.",
  listButton: "List your company",
  footerLine: "Find ingredient suppliers by what is in the lot.",
  operated: "Run by Paleo Foundation. Disclosure: Paleo Foundation also operates VLE.",
  claims:
    "Claim and takedown requests: marcus@vle.exchange. Takedown requests are honoured within 5 business days.",
  programs: "Heavy Metal Certified and future programs are on contaminantstandards.com.",
  signIn: "Sign in",
  navSuppliers: "Suppliers",
  navDocuments: "Documents",
  resultFor: (query: string) => `Results for “${query}”`,
  noResultFor: (query: string) => `No results for “${query}”`,
} as const;

const lotSteps = [
  { title: "Lot", detail: "Awaiting a confirmed purchase and lot identity." },
  { title: "Sample", detail: "Awaiting laboratory receipt and the sample custody record." },
  { title: "TECRID", detail: "Awaiting authenticated evidence bound to the lot." },
  { title: "QUALIFIED", detail: "Awaiting a qualification decision against the olive oil standard." },
  { title: "Reserved", detail: "Awaiting qualification and a recorded reservation." },
] as const;

export const supplier = {
  slug: "kasandrinos",
  name: "Kasandrinos",
  legalName: "Kasandrinos International LLC",
  href: "/suppliers/kasandrinos",
  website: "https://www.kasandrinos.com/",
  websiteLabel: "kasandrinos.com",
  transparencyUrl: kasandrinosTransparencyUrl,
  categories: ["olive-oil"] as CategoryId[],
  products: kasandrinosProducts.map((product) => ({ name: product.name, format: product.format, url: product.url })),
  certifications: kasandrinosCertifications.map((certificate) => certificate.name),
  steps: lotSteps,
  reportCount: kasandrinosReports.length,
};

export type HomeDocument = {
  id: string;
  kind: "Report" | "Certification";
  title: string;
  detail: string;
  datePrinted: string;
  sortKey: number | null;
  url: string;
  notice: string;
  statusNote?: string;
  search: string;
};

function sortKey(date: string): number | null {
  if (date === "date not stated") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const time = Date.parse(`${date}T00:00:00Z`);
    return Number.isNaN(time) ? null : time;
  }
  if (/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(date)) {
    const time = Date.parse(`${date} UTC`);
    return Number.isNaN(time) ? null : time;
  }
  const dotted = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(date);
  if (dotted) {
    const time = Date.parse(`${dotted[3]}-${dotted[2]}-${dotted[1]}T00:00:00Z`);
    return Number.isNaN(time) ? null : time;
  }
  // Printed "10/1/2024". Month and day are ambiguous. Both readings are in 2024, so it sorts as that year only.
  if (date === "10/1/2024") return Date.parse("2024-06-01T00:00:00Z");
  return null;
}

function documentSearch(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export const documents: HomeDocument[] = [
  ...kasandrinosReports.map((report, index) => ({
    id: `report-${index}`,
    kind: "Report" as const,
    title: report.category,
    detail: report.subject,
    datePrinted: report.date,
    sortKey: sortKey(report.date),
    url: report.url,
    notice: supplierDocumentNotice(report.date),
    search: documentSearch([
      "report",
      report.category,
      report.subject,
      report.date,
      supplier.name,
      supplier.legalName,
      "olive oil",
      "greece",
    ]),
  })),
  ...kasandrinosCertifications.map((certificate, index) => ({
    id: `cert-${index}`,
    kind: "Certification" as const,
    title: certificate.name,
    detail: certificate.description,
    datePrinted: certificate.date,
    sortKey: sortKey(certificate.date),
    url: certificate.url,
    notice: supplierDocumentNotice(certificate.date),
    statusNote: "statusNote" in certificate ? certificate.statusNote : undefined,
    search: documentSearch([
      "certification",
      certificate.name,
      certificate.description,
      certificate.date,
      "statusNote" in certificate ? certificate.statusNote : undefined,
      supplier.name,
      supplier.legalName,
      "olive oil",
      "greece",
    ]),
  })),
].sort((a, b) => {
  if (a.sortKey === null && b.sortKey === null) return a.title.localeCompare(b.title);
  if (a.sortKey === null) return 1;
  if (b.sortKey === null) return -1;
  return b.sortKey - a.sortKey || a.title.localeCompare(b.title);
});

const LATEST_LIMIT = 3;

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matches(query: string, haystack: string) {
  if (!query) return true;
  const hay = normalize(haystack);
  return normalize(query).split(" ").filter(Boolean).every((token) => hay.includes(token));
}

const supplierSearch = [
  supplier.name,
  supplier.legalName,
  "greece",
  "laconia",
  "olive oil",
  "organic",
  "extra virgin",
  copy.summary,
  copy.origin,
  ...supplier.products.map((product) => `${product.name} ${product.format}`),
  ...supplier.certifications,
  ...documents.map((document) => `${document.title} ${document.detail}`),
].join(" ");

export function homeHref(query: string, category: CategoryId | null) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  const value = params.toString();
  return value ? `/?${value}` : "/";
}

export function readHomeQuery(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
}

export function readHomeCategory(value: string | string[] | undefined): CategoryId | null {
  const raw = readHomeQuery(value);
  return categories.find((category) => category.id === raw)?.id ?? null;
}

export function buildHomeView(input: { q?: string | string[]; category?: string | string[] }) {
  const query = readHomeQuery(input.q);
  const category = readHomeCategory(input.category);
  const categoryMeta = categories.find((item) => item.id === category) ?? null;
  const inCategory = !category || supplier.categories.includes(category);
  const supplierHit = inCategory && matches(query, supplierSearch);
  const matchedDocuments = inCategory
    ? documents.filter((document) => matches(query, document.search))
    : [];
  const showSupplier = inCategory && (supplierHit || matchedDocuments.length > 0);
  const usingLatest = inCategory && showSupplier && (!query || matchedDocuments.length === 0);
  const shownDocuments = !showSupplier
    ? []
    : usingLatest
      ? documents.slice(0, LATEST_LIMIT)
      : matchedDocuments;

  let resultLine: string = copy.oneListed;
  if (!showSupplier && categoryMeta && !query) resultLine = categoryMeta.label;
  else if (!showSupplier && query) resultLine = copy.noResultFor(query);
  else if (query) resultLine = copy.resultFor(query);
  else if (!showSupplier) resultLine = copy.noneListed;

  return {
    query,
    category,
    categoryLabel: categoryMeta?.label ?? null,
    supplier: showSupplier ? supplier : null,
    documents: shownDocuments,
    showLatestNote: usingLatest,
    resultLine,
    filtered: Boolean(query || category),
  };
}
