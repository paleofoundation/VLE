export const DOCUMENT_TYPES = ["Heavy metals report", "Pesticide residue report", "Phthalates report", "Glyphosate report", "Arsenic report", "COA", "Certificate", "Other"] as const;
export const CATEGORIES = ["Spices", "Tea/matcha", "Cocoa/cacao", "Protein/supplement", "Olive oil", "Rice"] as const;
export const ANALYTES = ["lead", "arsenic", "cadmium", "mercury", "pesticides", "glyphosate", "phthalates", "aflatoxins"] as const;
export type ListingFilters = { category?: string; country?: string; analyte?: string; months?: number; listingSource?: string; docType?: string; supplier?: string; q?: string };

export function supplierSlug(name: string) {
  if (name === "Kasandrinos International") return "kasandrinos";
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// RFC 4180 fields, including commas, escaped quotes, CRLF and embedded newlines.
export function parseRoster(csv: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') { if (quoted && csv[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && csv[i + 1] === "\n") i++;
      row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (quoted) throw new Error("Unclosed CSV field");
  if (field || row.length) { row.push(field); rows.push(row); }
  const [headers, ...data] = rows;
  if (!headers?.includes("company") || !headers.includes("doc_url")) throw new Error("Roster headers missing");
  return data.map((r) => { if (r.length !== headers.length) throw new Error("Roster column count mismatch"); return Object.fromEntries(headers.map((h, i) => [h, r[i]])); });
}

export function reportDateFields(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value) return { reportDate: value, reportDateText: null };
  return { reportDate: null, reportDateText: value || null };
}

export function rosterDocument(r: Record<string, string>) {
  const tests = r.doc_tests || "";
  const analytes = ANALYTES.filter((name) => {
    const aliases: Record<string, RegExp> = { lead: /\bPb\b|lead/i, arsenic: /\bAs\b|arsenic/i, cadmium: /\bCd\b|cadmium/i, mercury: /\bHg\b|mercury/i, pesticides: /pesticid/i, glyphosate: /glyphosate/i, phthalates: /phthalate/i, aflatoxins: /aflatoxin/i };
    return aliases[name].test(tests);
  });
  const docType = /heavy metals/i.test(tests) ? "Heavy metals report" : /pesticid/i.test(tests) ? "Pesticide residue report" : /phthalate/i.test(tests) ? "Phthalates report" : /glyphosate/i.test(tests) ? "Glyphosate report" : /^arsenic$/i.test(tests) ? "Arsenic report" : "COA";
  const accreditation = r.lab?.match(/\(([^)]*(?:ISO|NATA|accredited)[^)]*)\)/i)?.[1] ?? null;
  return {
    productName: r.products || null, lotOrBatch: r.products?.match(/\b(?:lot|batch)\s+([^,)]+)/i)?.[1] ?? null,
    docType: docType as typeof DOCUMENT_TYPES[number], testsText: tests || null, analytes: [...analytes],
    labName: /^Not named on COA/i.test(r.lab) ? null : r.lab || null,
    labAccreditationAsStated: accreditation, ...reportDateFields(r.report_date),
    sourceUrl: r.doc_url, sourceDomain: new URL(r.doc_url).hostname,
    sourcePageUrl: /^https:\/\//.test(r.source_page) ? r.source_page : null,
    foundAt: "2026-10-19", verificationNote: r.verification_note || null,
  };
}

export function documentSourceText(domain: string, foundAt: string, sourcePageUrl?: string | null) {
  if (domain === "cdn.labdoor.io" && sourcePageUrl && new URL(sourcePageUrl).hostname.replace(/^www\./, "") === "transparentlabs.com") return `Published on cdn.labdoor.io (linked from transparentlabs.com), ${foundAt}. Not a VLE-verified result.`;
  return `Published by the supplier on ${domain}, ${foundAt}. Not a VLE-verified result.`;
}

export type VerifiedEvidence = { kind: "TECRID" | "HMTc"; id: string; issuer: "VLE"; status: "CURRENT"; expiresAt: string };
export function evidenceIsCurrent(evidence: VerifiedEvidence | null, now = new Date()) {
  return Boolean(evidence && ["TECRID", "HMTc"].includes(evidence.kind) && evidence.issuer === "VLE" && evidence.id && evidence.status === "CURRENT" && new Date(evidence.expiresAt) > now);
}
export const LOT_STEPS = ["Lot", "Sample", "TECRID", "QUALIFIED", "Reserved"] as const;
export type LotProgress = Partial<Record<typeof LOT_STEPS[number], string | null>>;
