import { EXAMPLE_SEARCH } from "./copy";

export const categories = [
  { id: "olive-oil", label: "Olive oil" },
  { id: "cocoa", label: "Cocoa" },
  { id: "protein", label: "Protein" },
  { id: "spices", label: "Spices" },
  { id: "tea-and-matcha", label: "Tea and matcha" },
  { id: "rice", label: "Rice" },
] as const;

export const contaminants = [
  { id: "lead", label: "Lead" },
  { id: "cadmium", label: "Cadmium" },
  { id: "arsenic", label: "Arsenic" },
  { id: "mercury", label: "Mercury" },
] as const;

export const documentAges = [
  { id: "30", label: "30 days or newer" },
  { id: "90", label: "90 days or newer" },
  { id: "365", label: "1 year or newer" },
] as const;

export type ExampleResult = {
  analyte: string;
  value: string;
  unit: string;
  limit: string;
  method: string;
  lab: string;
  date: string;
  plain: string;
  /** Null means the example result is not detected. */
  leadNumber: number | null;
};

export type ExampleLot = {
  id: string;
  name: string;
  results: ExampleResult[];
};

export const exampleLots: ExampleLot[] = [
  {
    id: "example-lot-1",
    name: "EXAMPLE-LOT-1",
    results: [
      {
        analyte: "Lead",
        value: "EXAMPLE Not detected",
        unit: "mg/kg",
        limit: "EXAMPLE 0.10",
        method: "EXAMPLE method",
        lab: "EXAMPLE lab",
        date: "EXAMPLE 2026-09-01",
        plain: "Not detected",
        leadNumber: null,
      },
    ],
  },
  {
    id: "example-lot-2",
    name: "EXAMPLE-LOT-2",
    results: [
      {
        analyte: "Lead",
        value: "EXAMPLE 0.08",
        unit: "mg/kg",
        limit: "EXAMPLE 0.10",
        method: "EXAMPLE method",
        lab: "EXAMPLE lab",
        date: "EXAMPLE 2026-09-01",
        plain: "Below the EXAMPLE limit",
        leadNumber: 0.08,
      },
    ],
  },
];

/** Signed-in price specimen on the design system only. Not a Kasandrinos price. */
export const examplePrice = "EXAMPLE 12.40 USD per kg";

export const countries = [{ id: "greece", label: "Greece" }] as const;

/**
 * Facts checked on kasandrinos.com product pages and the homepage those pages belong to.
 * Name, origin, sizes, and description only. No lab values, lot numbers, or certifications.
 */
export const kasandrinos = {
  id: "kasandrinos",
  name: "Kasandrinos",
  vendor: "Kasandrinos International",
  path: "/suppliers/kasandrinos",
  productPath: "/suppliers/kasandrinos/extra-virgin-olive-oil",
  productName: "Kasandrinos Organic Extra Virgin Olive Oil",
  categoryId: "olive-oil",
  categoryLabel: "Olive oil",
  makes: "Kasandrinos Organic Extra Virgin Olive Oil",
  origin: "Greece",
  countryId: "greece",
  countryLabel: "Greece",
  olives: "Koroneiki and Athinolia",
  process: "Cold-pressed, extracted without heat",
  sizes: [
    "100ml Bottle",
    "250ml Bottle",
    "500ml Bottle",
    "1L Bottle",
    "3L Can",
    "3L Bag in a Box",
    "12ml Travel Packets (1)",
    "12ml Travel Packets (20)",
  ],
  description:
    "Organic extra virgin olive oil, cold-pressed from hand-picked olives. Grown and pressed at family farms in Greece, using Koroneiki and Athinolia olives. Kasandrinos describes a fruity aroma and a peppery finish.",
} as const;

export function formatSizes(sizes: readonly string[]) {
  return sizes.join(", ");
}

export const exampleSearchHref = `/suppliers?q=${encodeURIComponent(EXAMPLE_SEARCH)}`;

export type DirectoryParams = Record<string, string | string[] | undefined>;

export type FilterState = {
  q: string;
  category?: string;
  contaminant?: string;
  result?: string;
  country?: string;
  certification?: string;
  documentAge?: string;
  hasPrice: boolean;
  explicit: boolean;
};

export type FilterChip = { key: keyof FilterState; label: string };

const categoryIds = new Set<string>(categories.map((item) => item.id));
const contaminantIds = new Set<string>(contaminants.map((item) => item.id));
const ageIds = new Set<string>(documentAges.map((item) => item.id));

function one(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function categoryLabel(id: string) {
  return categories.find((item) => item.id === id)?.label ?? id;
}

export function contaminantLabel(id: string) {
  return contaminants.find((item) => item.id === id)?.label ?? id;
}

export function documentAgeLabel(id: string) {
  return documentAges.find((item) => item.id === id)?.label ?? id;
}

export function parsePlainQuery(q: string): Omit<FilterState, "q" | "explicit"> {
  const text = q.toLowerCase();
  const categoryPhrases = [
    ["tea and matcha", "tea-and-matcha"],
    ["olive oil", "olive-oil"],
    ["matcha", "tea-and-matcha"],
    ["cocoa", "cocoa"],
    ["protein", "protein"],
    ["spices", "spices"],
    ["spice", "spices"],
    ["tea", "tea-and-matcha"],
    ["rice", "rice"],
  ] as const;

  let category: string | undefined;
  for (const [phrase, id] of categoryPhrases) {
    if (text.includes(phrase)) {
      category = id;
      break;
    }
  }

  let contaminant: string | undefined;
  for (const item of contaminants) {
    if (text.includes(item.id)) {
      contaminant = item.id;
      break;
    }
  }

  let documentAge: string | undefined;
  if (text.includes("30 days")) documentAge = "30";
  else if (text.includes("90 days")) documentAge = "90";
  else if (text.includes("1 year") || text.includes("one year")) documentAge = "365";

  const hasPrice =
    text.includes("with a price") ||
    text.includes("with price") ||
    text.includes("has a price") ||
    text.includes("has price");

  return {
    category,
    contaminant,
    result: text.includes("not detected") ? "not-detected" : undefined,
    country: text.includes("greece") ? "greece" : undefined,
    certification: text.includes("certification") || text.includes("certified") ? "on-file" : undefined,
    documentAge,
    hasPrice,
  };
}

export function readFilters(raw: DirectoryParams): FilterState {
  const q = one(raw.q).trim();
  const parsed = parsePlainQuery(q);
  const explicit = one(raw.applied) === "1";
  const categoryParam = one(raw.category);
  const contaminantParam = one(raw.contaminant);
  const resultParam = one(raw.result);
  const countryParam = one(raw.country);
  const certificationParam = one(raw.certification);
  const ageParam = one(raw.documentAge);
  const priceParam = one(raw.hasPrice);

  const category = categoryIds.has(categoryParam) ? categoryParam : explicit ? undefined : parsed.category;
  const contaminant = contaminantIds.has(contaminantParam) ? contaminantParam : explicit ? undefined : parsed.contaminant;
  const result = resultParam === "not-detected" ? "not-detected" : explicit ? undefined : parsed.result;
  const country = countryParam === "greece" ? "greece" : explicit ? undefined : parsed.country;
  const certification = certificationParam === "on-file" ? "on-file" : explicit ? undefined : parsed.certification;
  const documentAge = ageIds.has(ageParam) ? ageParam : explicit ? undefined : parsed.documentAge;

  let hasPrice = false;
  if (priceParam === "1") hasPrice = true;
  else if (priceParam === "0" || explicit) hasPrice = false;
  else hasPrice = parsed.hasPrice;

  return { q, category, contaminant, result, country, certification, documentAge, hasPrice, explicit };
}

export function filterChips(filters: FilterState): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.category) chips.push({ key: "category", label: `Category: ${categoryLabel(filters.category)}` });
  if (filters.contaminant) chips.push({ key: "contaminant", label: `Contaminant tested: ${contaminantLabel(filters.contaminant)}` });
  if (filters.result === "not-detected") chips.push({ key: "result", label: "Result: Not detected" });
  if (filters.country === "greece") chips.push({ key: "country", label: "Country: Greece" });
  if (filters.certification) chips.push({ key: "certification", label: "Certification: on file" });
  if (filters.documentAge) chips.push({ key: "documentAge", label: `Document age: ${documentAgeLabel(filters.documentAge)}` });
  if (filters.hasPrice) chips.push({ key: "hasPrice", label: "Has price: on file" });
  return chips;
}

export function directoryHref(filters: FilterState, patch: Partial<FilterState> = {}) {
  const next: FilterState = { ...filters, ...patch };
  const params = new URLSearchParams();
  params.set("applied", "1");
  if (next.q) params.set("q", next.q);
  if (next.category) params.set("category", next.category);
  if (next.contaminant) params.set("contaminant", next.contaminant);
  if (next.result) params.set("result", next.result);
  if (next.country) params.set("country", next.country);
  if (next.certification) params.set("certification", next.certification);
  if (next.documentAge) params.set("documentAge", next.documentAge);
  params.set("hasPrice", next.hasPrice ? "1" : "0");
  return `/suppliers?${params.toString()}`;
}

export function hrefWithout(filters: FilterState, key: keyof FilterState) {
  if (key === "hasPrice") return directoryHref(filters, { hasPrice: false });
  return directoryHref(filters, { [key]: undefined });
}

function parsedAnything(parsed: Omit<FilterState, "q" | "explicit">) {
  return Boolean(
    parsed.category ||
      parsed.contaminant ||
      parsed.result ||
      parsed.country ||
      parsed.certification ||
      parsed.documentAge ||
      parsed.hasPrice,
  );
}

export function supplierMatches(filters: FilterState) {
  if (filters.q && !filters.explicit) {
    const parsed = parsePlainQuery(filters.q);
    const text = filters.q.toLowerCase();
    const namesSupplier = text.includes("kasandrinos") || text.includes("olive");
    if (!parsedAnything(parsed) && !namesSupplier) return false;
  }
  if (filters.category && filters.category !== kasandrinos.categoryId) return false;
  if (filters.contaminant) return false;
  if (filters.result === "not-detected") return false;
  if (filters.country && filters.country !== kasandrinos.countryId) return false;
  if (filters.certification) return false;
  if (filters.documentAge) return false;
  if (filters.hasPrice) return false;
  return true;
}

export function isSearch(filters: FilterState) {
  return filters.q.length > 0 || filterChips(filters).length > 0;
}
