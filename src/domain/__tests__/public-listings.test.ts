import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseRoster, rosterDocument, supplierSlug, reportDateFields, documentSourceText, evidenceIsCurrent } from "../public-listings";
const rows = parseRoster(readFileSync("data/seed/supplier-roster-2026-10-19.csv", "utf8"));
describe("roster provenance", () => {
  it("imports exactly the supplied companies and rows", () => { expect(rows).toHaveLength(22); expect(new Set(rows.map((r) => r.company)).size).toBe(16); expect(new Set(rows.map((r) => supplierSlug(r.company))).size).toBe(16); });
  it("preserves partial and attributed dates without guessing", () => { for (const s of ["2023-07", "2025 (May-June, per report no)", "2026-07-09 (per supplier page)", "2026-02-31"]) expect(reportDateFields(s)).toEqual({ reportDate: null, reportDateText: s }); expect(reportDateFields("2026-01-27").reportDate).toBe("2026-01-27"); });
  it("keeps missing facts missing and preserves original URLs", () => { for (const r of rows) { const d = rosterDocument(r); expect(d.sourceUrl).toBe(r.doc_url); expect(d.sourceDomain).toBe(new URL(r.doc_url).hostname); } expect(rosterDocument(rows.find((r) => r.lab.startsWith("Not named"))!).labName).toBeNull(); });
  it("does not infer individual analytes from generic heavy metals", () => { const r = { ...rows[0], doc_tests: "Heavy metals" }; expect(rosterDocument(r).analytes).toEqual([]); });
  it("labels the Labdoor source explicitly", () => expect(documentSourceText("cdn.labdoor.io", "2026-10-19", "https://www.transparentlabs.com/pages/third-party-tests")).toContain("Published on cdn.labdoor.io (linked from transparentlabs.com)"));
  it("handles quoted commas, escaped quotes and newlines", () => expect(parseRoster('company,doc_url\r\n"A, ""B""",https://a.test\r\n')[0].company).toBe('A, "B"'));
  it("rejects malformed input", () => { expect(() => parseRoster('company,doc_url\n"open')).toThrow(); });
  it("requires real current VLE evidence for a verified badge", () => { expect(evidenceIsCurrent(null)).toBe(false); expect(evidenceIsCurrent({ kind: "TECRID", id: "real-id", issuer: "VLE", status: "CURRENT", expiresAt: "2026-01-01" }, new Date("2026-10-19"))).toBe(false); });
});
