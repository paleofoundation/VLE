import { z } from "zod";

// Exact decimal arithmetic. No numeric policy, scale or weight is selected here.
const isDecimal = (value: unknown): value is string => typeof value === "string" && /^(0|[1-9]\d*)(\.\d+)?$/.test(value);
const decimal = z.string().refine(isDecimal);
export function compareDecimal(a: string, b: string) {
  const [ai, af = ""] = a.split(".");
  const [bi, bf = ""] = b.split(".");
  const scale = Math.max(af.length, bf.length);
  const av = BigInt(ai + af.padEnd(scale, "0"));
  const bv = BigInt(bi + bf.padEnd(scale, "0"));
  return av < bv ? -1 : av > bv ? 1 : 0;
}
export function addDecimal(a: string, b: string) {
  const [ai, af = ""] = a.split(".");
  const [bi, bf = ""] = b.split(".");
  const scale = Math.max(af.length, bf.length);
  const sum = (BigInt(ai + af.padEnd(scale, "0")) + BigInt(bi + bf.padEnd(scale, "0"))).toString().padStart(scale + 1, "0");
  return scale ? `${sum.slice(0, -scale)}.${sum.slice(-scale)}` : sum;
}
const text = z.string().trim().min(1);
const timestamp = z.iso.datetime({ offset: true });
export const matchScopeSchema = z.object({
  productCode: z.literal("COCOA_POWDER"), productTypeId: text, profileVersionId: text,
  intendedUse: text, jurisdiction: text,
}).strict();
const mapping = z.object({
  analyte: z.enum(["lead", "cadmium", "arsenic", "mercury"]), species: text,
  unit: z.literal("ppm"), basis: text, matrix: text, method: text,
  sourceTitle: text, authority: text, edition: text, effectiveAt: timestamp,
  retrievedAt: timestamp, locator: text, reviewer: text,
  regulatoryMapping: z.enum(["MAPPED", "NO_REGULATORY_LIMIT_MAPPED"]),
  label: z.literal("VLE ranking policy"),
  // Ordered from lower concentration to higher concentration. No fallback band.
  grades: z.array(z.object({ grade: text, maxValue: decimal }).strict()).nonempty(),
}).strict();
export const policySchema = z.object({
  MATCH_POLICY_VERSION: z.object({ id: text, effectiveAt: timestamp, approvedBy: text }).strict(),
  MATCH_SCOPE: matchScopeSchema,
  MATCH_REQUIRED_ANALYTES: z.array(mapping.shape.analyte).nonempty(),
  MATCH_STANDARD_MAPPING: z.array(mapping).nonempty(),
  MATCH_GRADE_UTILITY: z.record(z.string(), decimal),
  MATCH_WEIGHT_TECRID: decimal.refine((n) => isDecimal(n) && compareDecimal(n, "0") > 0),
  MATCH_WEIGHT_ICS_CERT: decimal.refine((n) => isDecimal(n) && compareDecimal(n, "0") > 0),
  MATCH_ICS_CERTIFICATION_SCOPE: z.object({ program: text, standardVersion: text }).strict(),
  MATCH_VERIFICATION_FRESHNESS_POLICY: z.object({
    // One explicitly approved maximum age covers collection, report, issuance and verification checks.
    id: text, maxAgeMs: z.number().int().positive().safe(),
    contractVersions: z.array(text).nonempty(), issuers: z.array(text).nonempty(),
    authenticationMethods: z.array(text).nonempty(),
  }).strict(),
  MATCH_CENSORING_POLICY: z.literal("REJECT_CENSORED"),
  MATCH_NUMERIC_POLICY: z.object({
    id: text, representation: z.literal("EXACT_DECIMAL_STRING"),
    display: z.literal("UNROUNDED"), comparableUtilitiesApproved: z.literal(true),
  }).strict(),
}).strict().superRefine((p, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: "custom", message });
  const panel = p.MATCH_REQUIRED_ANALYTES;
  if (new Set(panel).size !== panel.length) fail("Duplicate panel analyte");
  if (p.MATCH_STANDARD_MAPPING.length !== panel.length || panel.some((a) => p.MATCH_STANDARD_MAPPING.filter((m) => m.analyte === a).length !== 1)) fail("Incomplete panel mapping");
  for (const m of p.MATCH_STANDARD_MAPPING) {
    const seen = new Set<string>();
    m.grades.forEach((g, i) => {
      if (seen.has(g.grade)) fail("Duplicate grade");
      seen.add(g.grade);
      const u = Object.hasOwn(p.MATCH_GRADE_UTILITY, g.grade) ? p.MATCH_GRADE_UTILITY[g.grade] : undefined;
      if (u === undefined) fail("Missing grade utility");
      const previous = m.grades[i - 1];
      if (!isDecimal(g.maxValue) || (u !== undefined && !isDecimal(u)) || (previous && (!isDecimal(previous.maxValue) || !isDecimal(p.MATCH_GRADE_UTILITY[previous.grade])))) { fail("Invalid numeric policy"); return; }
      if (previous && (compareDecimal(previous.maxValue, g.maxValue) >= 0 || (u !== undefined && Object.hasOwn(p.MATCH_GRADE_UTILITY, previous.grade) && compareDecimal(p.MATCH_GRADE_UTILITY[previous.grade], u) <= 0))) fail("Reversed or ambiguous grade ordering");
    });
  }
});
export type MatchPolicy = z.infer<typeof policySchema>;
export type MatchScope = z.infer<typeof matchScopeSchema>;
export type LoadedPolicy = { enabled: true; policy: MatchPolicy } | { enabled: false; reason: "No approved grade mapping" };

/** Caller supplies a reviewed configuration object. No environment writes or defaults. */
export function loadMatchPolicy(config?: unknown): LoadedPolicy {
  try {
    const parsed = policySchema.safeParse(config);
    return parsed.success ? { enabled: true, policy: parsed.data } : { enabled: false, reason: "No approved grade mapping" };
  } catch {
    return { enabled: false, reason: "No approved grade mapping" };
  }
}
