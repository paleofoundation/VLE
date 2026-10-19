import { expect, it } from "vitest";
import { listingFilters, matchesDocument } from "../listing-filters";
it("accepts only supported freshness windows and enum filters", () => {
 expect(listingFilters({ months: "12", category: "Spices", analyte: "lead", status: "MEMBER" })).toMatchObject({ months: 12, category: "Spices", analyte: "lead", listingSource: "MEMBER" });
 expect(listingFilters({ months: "-1", category: "unknown", analyte: ["lead", "arsenic"], status: "ADMIN" })).toMatchObject({ months: undefined, category: undefined, analyte: undefined, listingSource: undefined });
});
it("limits search input and rejects arrays", () => { expect(listingFilters({ q: " x " }).q).toBe("x"); expect(listingFilters({ q: ["x"] }).q).toBeUndefined(); expect(listingFilters({ q: "x".repeat(1000) }).q).toHaveLength(100); });

it("retains lab/date filters and ignores invalid dates", () => { expect(listingFilters({ lab: "Light Labs", from: "2026-01-01", to: "bad" })).toMatchObject({ lab: "Light Labs", from: "2026-01-01", to: undefined }); });

const document = { reportDate: "2026-01-27", docType: "Heavy metals report", analytes: ["lead"], productName: "Olive oil", testsText: "Heavy metals", labName: "Light Labs" };
const supplier = { displayName: "Supplier", categories: ["Olive oil"], country: "Greece", slug: "supplier", listingSource: "PUBLIC_DOCUMENTS" };
it("combines document facets rather than broadening results", () => {
 expect(matchesDocument(document, supplier, { category: "Olive oil", analyte: "lead", lab: "Light Labs", from: "2026-01-01", to: "2026-02-01" })).toBe(true);
 for (const f of [{ category: "Rice" }, { analyte: "arsenic" }, { lab: "Other" }, { from: "2026-02-01" }, { to: "2025-12-31" }, { listingSource: "MEMBER" }]) expect(matchesDocument(document, supplier, f)).toBe(false);
});
it("excludes partial dates from range and freshness filters", () => {
 expect(matchesDocument({ ...document, reportDate: null }, supplier, { from: "2026-01-01" })).toBe(false);
 expect(matchesDocument({ ...document, reportDate: null }, supplier, { months: 24 }, new Date("2026-10-19"))).toBe(false);
 expect(matchesDocument(document, supplier, { months: 6 }, new Date("2026-10-19"))).toBe(false);
 expect(matchesDocument(document, supplier, { months: 12 }, new Date("2026-10-19"))).toBe(true);
});
