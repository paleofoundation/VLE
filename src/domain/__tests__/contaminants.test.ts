import { describe, expect, it } from "vitest";
import { DomainError } from "../errors";
import {
  assertContaminantAttachment,
  contaminantDocumentationTypes,
} from "../contaminants";

const base = {
  documentationType: "HEAVY_METALS" as const,
  subject: "LOT" as const,
  physicalLotId: "11111111-1111-4111-8111-111111111111",
  fileName: "metals-reference.pdf",
  referenceUrl: "https://files.example.test/metals-reference.pdf",
};

describe("contaminant documentation types", () => {
  it("publishes three types, each with an explainer and an Institute of Contaminant Standards index", () => {
    expect(contaminantDocumentationTypes.map((type) => [type.code, type.indexUrl])).toEqual([
      ["HEAVY_METALS", "https://heavymetalindex.com"],
      ["PFAS", "https://foreverchemicalsindex.com"],
      ["MICROPLASTICS", "https://contaminantstandards.com/network/microplastics"],
    ]);
    for (const type of contaminantDocumentationTypes) {
      expect(type.explainer.length).toBeGreaterThan(80);
      expect(type.explainer).toContain("Institute of Contaminant Standards");
      expect(type.explainer).not.toMatch(/[\u2013\u2014]/);
      expect(type.explainer.toLowerCase()).not.toMatch(/\b\u0070artners?|\b\u0070artnerships?/);
      expect(JSON.stringify(type)).not.toMatch(/\d+(\.\d+)?\s*(ppm|ppb|mg\/kg)/i);
    }
  });

  it("accepts one lot or one profile, and rejects a result-shaped payload field by requiring the subject", () => {
    expect(() => assertContaminantAttachment(base)).not.toThrow();
    expect(() => assertContaminantAttachment({
      ...base,
      subject: "PROFILE",
      physicalLotId: undefined,
      complianceProfileId: "22222222-2222-4222-8222-222222222222",
    })).not.toThrow();
    expect(() => assertContaminantAttachment({ ...base, complianceProfileId: "22222222-2222-4222-8222-222222222222" })).toThrow(DomainError);
    expect(() => assertContaminantAttachment({ ...base, physicalLotId: undefined })).toThrow(/one physical lot/);
    expect(() => assertContaminantAttachment({ ...base, referenceUrl: "http://files.example.test/a.pdf" })).toThrow(/https/);
    expect(() => assertContaminantAttachment({ ...base, fileName: "   " })).toThrow(/File name/);
  });
});
