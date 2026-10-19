import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { suppliers, documents, filterSuppliers, parseSearch, isStale } from "../catalog";
describe("public seed evidence", () => {
  it("keeps source documents public and does not invent membership or prices", () => {
    expect(suppliers).toHaveLength(16);
    expect(suppliers.every(s=>s.status==="PUBLIC_DOCUMENTS")).toBe(true);
    expect(documents.every(d=>new URL(d.url).protocol==="https:")).toBe(true);
    expect(filterSuppliers({hasPrice:"yes"})).toHaveLength(0);
  });
  it("filters ND against the named analyte on the same report", () => {
    expect(parseSearch("olive oil with lead not detected")).toEqual({category:"olive-oil",analyte:"lead",result:"nd"});
    expect(filterSuppliers({q:"olive oil with lead not detected"}).map(s=>s.slug)).toEqual(["kasandrinos"]);
    expect(filterSuppliers({category:"cocoa",analyte:"lead",result:"nd"})).toHaveLength(0);
  });
  it("excludes partial dates from freshness assertions", () => {
    const recent=filterSuppliers({months:"6"},new Date("2026-10-19T12:00:00Z"));
    expect(recent.some(s=>s.slug==="organic-mandya")).toBe(false);
    expect(recent.some(s=>s.slug==="transparent-labs")).toBe(false);
  });
  it("preserves the issuer confirmation and all sourced FAQ questions", () => {
    const kas=suppliers.find(s=>s.slug==="kasandrinos")!;
    expect(kas.certifications.find(c=>c.name==="Paleo Foundation")?.status).toBe("Issuer-confirmed current");
    const faq=JSON.parse(readFileSync("src/content/fieldwork/faq-sourcing.json","utf8"));
    expect(faq.groups).toHaveLength(8);
    expect(faq.groups.flatMap((g:{questions:unknown[]})=>g.questions)).toHaveLength(37);
  });
  it("marks a profile stale after twelve months, not before", () => {
    expect(isStale("2025-10-19",new Date("2026-10-19T00:00:00Z"))).toBe(true);
    expect(isStale("2025-10-20",new Date("2026-10-19T00:00:00Z"))).toBe(false);
  });
});
