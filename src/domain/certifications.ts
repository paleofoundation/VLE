import { z } from "zod";
export const CERTIFICATION_GROUPS = [
  { name: "Organic", items: ["USDA Organic", "EU Organic"] },
  { name: "Diet and lifestyle", items: ["Paleo", "Keto", "Grain-Free", "Gluten-Free", "Vegan"] },
  { name: "Religious", items: ["Kosher", "Halal"] },
  { name: "Non-GMO", items: ["Non-GMO"] },
  { name: "Food safety", items: ["BRCGS", "SQF", "FSSC 22000", "ISO 22000", "GMP"] },
  { name: "Contaminant", items: ["Heavy Metal Certified (HMTc)"] },
  { name: "Other", items: ["Other"] },
] as const;
export const CERTIFICATION_KEYS = CERTIFICATION_GROUPS.flatMap((g) => [...g.items]);
const blank = z.string().trim().max(300).transform((s) => s || null);
export const certificationSchema = z.object({
  certificationKey: z.string().refine((s) => CERTIFICATION_KEYS.includes(s as typeof CERTIFICATION_KEYS[number])),
  otherName: blank, certifyingBody: blank, certificateNumber: blank,
  expiresOn: z.string().refine((s) => !s || /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s).transform((s) => s || null),
  sourceUrl: z.string().trim().max(2000).refine((s) => !s || /^https:\/\//.test(s) && !!URL.canParse(s), "Use an original HTTPS certificate link").transform((s) => s || null),
}).refine((s) => s.certificationKey !== "Other" || !!s.otherName, "Name the other certification");
export type CertificationLabel = { expiresOn: string | null; confirmedAt: string | null; confirmedIssuer: string | null };
export function certificationLabel(c: CertificationLabel) {
  const date = c.confirmedAt ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${c.confirmedAt}T00:00:00Z`)) : null;
  return c.confirmedAt ? `Confirmed by the issuing body${c.confirmedIssuer ? `, ${c.confirmedIssuer}` : ""}, ${date}.` : "Supplier-reported. Not a VLE-verified result.";
}
export function certificationExpiry(expiresOn: string | null, today = new Date().toISOString().slice(0, 10)) {
  return expiresOn ? `${expiresOn < today ? "Expired" : "Expires"} ${expiresOn}` : "Expiry date not stated";
}
export const SUGGESTION_RULES = {
  heavyMetalCategories: ["Olive oil", "Cocoa/cacao", "Spices", "Tea/matcha", "Rice", "Protein/supplement"],
  lifestyle: ["Paleo", "Keto"], foodSafety: ["BRCGS", "SQF", "FSSC 22000", "ISO 22000", "GMP"],
};
export function certificationSuggestionsFor(categories: string[], held: string[]) {
  const result: { certificationKey: string; note: string }[] = [];
  if (categories.some((c) => SUGGESTION_RULES.heavyMetalCategories.includes(c)) && !held.includes("Heavy Metal Certified (HMTc)")) result.push({ certificationKey: "Heavy Metal Certified (HMTc)", note: "Consider lot-relevant heavy metal certification for your category." });
  for (const key of SUGGESTION_RULES.lifestyle) if (!held.includes(key)) result.push({ certificationKey: key, note: `Consider ${key} certification where your ingredients meet the program requirements.` });
  if (!held.some((s) => SUGGESTION_RULES.foodSafety.includes(s))) result.push({ certificationKey: "Food safety", note: "Add the food safety certification you hold. Leave it blank if none is held." });
  return result;
}
export function icsApplyUrl() { const value = process.env.ICS_APPLY_URL; return value && URL.canParse(value) && new URL(value).protocol === "https:" ? value : "https://contaminantstandards.com"; }
