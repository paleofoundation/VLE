import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXAMPLE_SEARCH, HERO_LINE, NEED_LINE, PRICE_LINE } from "./copy";
import { kasandrinosLots, filterChips, readFilters, supplierMatches } from "./example-data";
import { isPublishedProduct } from "./listing";

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return filesUnder(full);
    if (full.endsWith(".test.ts")) return [];
    return full.endsWith(".ts") || full.endsWith(".tsx") || full.endsWith(".css") ? [full] : [];
  });
}

describe("plain-language search", () => {
  it("applies category, contaminant, and not-detected filters from the example sentence", () => {
    const filters = readFilters({ q: EXAMPLE_SEARCH });
    expect(filterChips(filters).map((chip) => chip.label)).toEqual([
      "Category: Olive oil",
      "Contaminant tested: Lead",
      "Result: Not detected",
    ]);
    expect(supplierMatches(filters)).toBe(false);
  });

  it("treats an unmatched category as nothing", () => {
    const filters = readFilters({ category: "cocoa" });
    expect(supplierMatches(filters)).toBe(false);
    expect(filterChips(filters).map((chip) => chip.label)).toEqual(["Category: Cocoa"]);
  });

  it("does not bring a removed filter back from the original sentence", () => {
    const filters = readFilters({
      q: EXAMPLE_SEARCH,
      applied: "1",
      contaminant: "lead",
      result: "not-detected",
    });
    expect(filters.category).toBeUndefined();
    expect(supplierMatches(filters)).toBe(false);
  });

  it("matches olive oil from Greece and skips lab filters with no lab file", () => {
    const greece = readFilters({ q: "olive oil from greece" });
    expect(filterChips(greece).map((chip) => chip.label)).toEqual(["Category: Olive oil", "Country: Greece"]);
    expect(supplierMatches(greece)).toBe(true);
    expect(supplierMatches(readFilters({ category: "olive-oil" }))).toBe(true);
    const certified = readFilters({ q: "certified olive oil" });
    expect(filterChips(certified).map((chip) => chip.label)).toContain("Certification: on file");
    expect(supplierMatches(certified)).toBe(false);
    expect(supplierMatches(readFilters({ hasPrice: "1" }))).toBe(false);
    expect(supplierMatches(readFilters({ documentAge: "90" }))).toBe(false);
  });

  it("finds nothing when the words do not map to a listing", () => {
    expect(supplierMatches(readFilters({ q: "hello" }))).toBe(false);
  });
});

describe("round 1 copy rules", () => {
  it("keeps the required lines exact", () => {
    expect(HERO_LINE).toBe("Know what's in the lot before you buy it.");
    expect(NEED_LINE).toBe("Tell us what you need and we'll find suppliers for it.");
    expect(PRICE_LINE).toBe("Sign in to see prices");
  });

  it("uses no em dashes, partner language, or N/A in the new public UI", () => {
    const roots = [path.join("src", "exchange"), path.join("src", "app", "design-system"), path.join("src", "app", "email-sign-in")];
    const pageFiles = [
      path.join("src", "app", "page.tsx"),
      path.join("src", "app", "suppliers", "page.tsx"),
      path.join("src", "app", "suppliers", "kasandrinos", "page.tsx"),
      path.join("src", "app", "suppliers", "kasandrinos", "extra-virgin-olive-oil", "page.tsx"),
    ];
    const files = [...roots.flatMap((dir) => filesUnder(dir)), ...pageFiles];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/[\u2013\u2014]/);
      expect(source.toLowerCase(), file).not.toContain("partner");
      expect(source, file).not.toMatch(/\bN\/A\b/i);
    }
  });

  it("keeps the EXAMPLE label off the real listing pages", () => {
    const files = [
      path.join("src", "app", "page.tsx"),
      path.join("src", "app", "suppliers", "page.tsx"),
      path.join("src", "app", "suppliers", "kasandrinos", "page.tsx"),
      path.join("src", "app", "suppliers", "kasandrinos", "extra-virgin-olive-oil", "page.tsx"),
      path.join("src", "exchange", "brand-limits.tsx"),
      path.join("src", "exchange", "confirm-upload.tsx"),
    ];
    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toContain("EXAMPLE");
    }
    const pending = readFileSync(path.join("src", "exchange", "ui.tsx"), "utf8");
    expect(pending).toContain("Lab results pending.");
    const facts = readFileSync(path.join("src", "exchange", "example-data.ts"), "utf8");
    const listing = facts.slice(facts.indexOf("export const kasandrinos"), facts.indexOf("export function formatSizes"));
    expect(listing).toContain("Kasandrinos Organic Extra Virgin Olive Oil");
    expect(listing).toContain("Greece");
    expect(listing).toContain("12ml Travel Packets (20)");
    expect(listing).not.toContain("EXAMPLE");
    expect(isPublishedProduct(kasandrinosLots)).toBe(false);
    const product = readFileSync(path.join("src", "app", "suppliers", "kasandrinos", "extra-virgin-olive-oil", "page.tsx"), "utf8");
    expect(product).toContain("DraftAwaitingCoa");
    expect(product).toContain("CoaSlot");
    expect(product).toContain("kasandrinosPhotos");
    for (const file of [path.join("src", "app", "page.tsx"), path.join("src", "app", "suppliers", "page.tsx"), path.join("src", "app", "design-system", "page.tsx")]) {
      expect(readFileSync(file, "utf8"), file).not.toContain("/suppliers/kasandrinos/");
    }
  });
});
