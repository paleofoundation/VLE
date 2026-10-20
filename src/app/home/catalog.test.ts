import { describe, expect, it } from "vitest";
import { buildHomeView, copy, documents, supplier } from "./catalog";

const prose = JSON.stringify({ copy, documents: documents.map((document) => document.notice), supplier: supplier.name });

describe("homepage catalog", () => {
  it("lists only Kasandrinos and keeps printed document dates", () => {
    expect(supplier.name).toBe("Kasandrinos");
    expect(supplier.products).toHaveLength(7);
    expect(supplier.certifications).toHaveLength(4);
    expect(documents.filter((document) => document.kind === "Report")).toHaveLength(11);
    expect(documents.map((document) => document.datePrinted)).toContain("May 18, 2026");
    expect(documents.map((document) => document.datePrinted)).toContain("21.11.2025");
    expect(documents.map((document) => document.datePrinted)).toContain("10/1/2024");
    expect(documents.map((document) => document.datePrinted)).toContain("date not stated");
    expect(documents.some((document) => /ppm|ppb|mg\/kg/i.test(`${document.title} ${document.detail} ${document.notice}`))).toBe(false);
  });

  it("orders the latest dated documents without treating an ambiguous date as a day", () => {
    const view = buildHomeView({});
    expect(view.documents.map((document) => document.datePrinted)).toEqual(["May 18, 2026", "2026-03-02", "2026-02-04"]);
    const full = buildHomeView({ q: "kasandrinos" });
    const printed = full.documents.map((document) => document.datePrinted);
    expect(printed.at(-1)).toBe("date not stated");
    expect(printed.indexOf("10/1/2024")).toBeGreaterThan(printed.indexOf("21.11.2025"));
  });

  it("filters suppliers and documents from published names only", () => {
    expect(buildHomeView({ category: "olive-oil" }).supplier?.slug).toBe("kasandrinos");
    expect(buildHomeView({ category: "cocoa" }).supplier).toBeNull();
    expect(buildHomeView({ category: "tea-matcha" }).documents).toHaveLength(0);
    expect(buildHomeView({ q: "phthalates" }).documents.map((document) => document.title)).toEqual(["Phthalates", "Phthalates"]);
    expect(buildHomeView({ q: "lead" }).supplier).toBeNull();
    expect(buildHomeView({ q: "lead" }).documents).toHaveLength(0);
    expect(buildHomeView({ q: "laconia" }).supplier?.name).toBe("Kasandrinos");
  });

  it("keeps marketplace copy free of em dashes, competitor names, and partner language", () => {
    expect(prose).not.toMatch(/[—–]/);
    expect(prose.toLowerCase()).not.toMatch(/partner|knowde|prospector|thomasnet|chemondis/);
  });
});
