import { expect, it } from "vitest";
import { listingFilters } from "../listing-filters";
it("accepts only supported freshness windows and enum filters", () => {
 expect(listingFilters({ months: "12", category: "Spices", analyte: "lead", status: "MEMBER" })).toMatchObject({ months: 12, category: "Spices", analyte: "lead", listingSource: "MEMBER" });
 expect(listingFilters({ months: "-1", category: "unknown", analyte: ["lead", "arsenic"], status: "ADMIN" })).toMatchObject({ months: undefined, category: undefined, analyte: undefined, listingSource: undefined });
});
it("limits search input and rejects arrays", () => { expect(listingFilters({ q: " x " }).q).toBe("x"); expect(listingFilters({ q: ["x"] }).q).toBeUndefined(); expect(listingFilters({ q: "x".repeat(1000) }).q).toHaveLength(100); });
