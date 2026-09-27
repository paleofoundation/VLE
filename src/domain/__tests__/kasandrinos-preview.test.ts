import { describe, expect, it } from "vitest";
import { isKasandrinosPreviewPath } from "../kasandrinos-preview-path";
import {
  buildKasandrinosCompliancePack,
  getPreviewBrand,
  getPreviewLot,
  kasandrinosPdfFileName,
  kasandrinosPreviewEnabled,
  kasandrinosPreviewTour,
  PREVIEW_NOTICE,
} from "../kasandrinos-preview";

describe("Kasandrinos preview", () => {
  it("renders only outside production", () => {
    expect(kasandrinosPreviewEnabled("production")).toBe(false);
    expect(kasandrinosPreviewEnabled("preview")).toBe(true);
    expect(kasandrinosPreviewEnabled(undefined)).toBe(true);
  });

  it("keeps the preview path off the public shelf and the Clerk index header", () => {
    expect(isKasandrinosPreviewPath("/preview/kasandrinos")).toBe(true);
    expect(isKasandrinosPreviewPath("/preview/kasandrinos/lots/227-k-b")).toBe(true);
    expect(isKasandrinosPreviewPath("/preview/kasandrinos-other")).toBe(false);
    expect(isKasandrinosPreviewPath("/lots/227-k-b")).toBe(false);
    expect(isKasandrinosPreviewPath("/ops")).toBe(false);
    expect(isKasandrinosPreviewPath("/preview/kasandrinos/certificates/heavy-metal-testing-evoo.pdf")).toBe(true);
    expect(isKasandrinosPreviewPath("/preview/kasandrinos/ops/lots/227-k-b/compliance-pack/download")).toBe(true);
    expect(kasandrinosPreviewTour.map((step) => step.path).every((path) => path.startsWith("/preview/kasandrinos"))).toBe(true);
  });

  it("stops lot 227 before nomination and keeps the real heavy-metals panel", () => {
    const lot = getPreviewLot("227-k-b");
    expect(lot?.supplierLotCode).toBe("227 K/B");
    expect(lot?.test).toBe("43301");
    expect(lot?.lotState).toBe("not created, stopped before nomination");
    expect(lot?.rail[0]).toMatchObject({ label: "Nomination", state: "now" });
    expect(lot?.rail.slice(1).every((step) => step.state === "locked")).toBe(true);
    expect(lot?.heavyMetalStatusClaim).toBe("not_claimable");
    expect(lot?.analytes.find((row) => row.analyte === "Arsenic")).toMatchObject({ loq: "1.81 ppb", result: "ND", lightLabsSpec: "740.74 ppb" });
    expect(lot?.pdfHref).toBe("/preview/kasandrinos/certificates/heavy-metal-testing-evoo.pdf");
    expect(kasandrinosPdfFileName("heavy-metal-testing-evoo.pdf")).toBe("Heavy_Metal_Testing_EVOO.pdf");
  });

  it("keeps lot 228 aluminum-only and the July certificates off both lots", () => {
    const lot = getPreviewLot("228-k-b");
    const brand = getPreviewBrand();
    expect(lot?.analytes.map((row) => row.analyte)).toEqual(["Aluminum"]);
    expect(lot?.heavyMetalPanelOnCertificate).toBe(false);
    expect(brand.supplierOrganization).toBeNull();
    expect(brand.pending.map((item) => item.test)).toEqual(["13693", "13676", "13692", "13691", "13679", "13680"]);
    expect(getPreviewLot("missing")).toBeNull();
  });

  it("builds a closed compliance pack with the repository checksum", () => {
    const pack = buildKasandrinosCompliancePack(undefined, new Date("2026-09-27T00:00:00.000Z"));
    expect(pack.preview.notice).toBe(PREVIEW_NOTICE);
    expect(pack.preview.databaseWrite).toBe(false);
    expect(pack.physicalLot).toBeNull();
    expect(pack.statusAtExport.publicationGateEligible).toBe(false);
    expect(pack.statusAtExport.permittedClaim).toBeNull();
    expect(pack.statusAtExport.qualified).toBe(false);
    expect(pack.statusAtExport.reserved).toBe(false);
    expect(pack.samples).toEqual([]);
    expect(pack.tecridEvidence).toEqual([]);
    expect(pack.qualificationDecisions).toEqual([]);
    expect(pack.marketplaceListingHistory).toEqual([]);
    expect(pack.lightLabsCertificate.test).toBe("43301");
    expect(pack.notAttached.map((item) => item.test)).not.toContain("43301");
    expect(pack.checksum.payloadDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(pack.checksum.limitation).toMatch(/not a digital signature/i);
  });
});
