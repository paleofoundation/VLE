import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import rawPacket from "../../../fixtures/kasandrinos/light-labs-certificates.json";
import { assessKasandrinosIntake, formatKasandrinosIntakeReport, parseKasandrinosPacket } from "../kasandrinos-intake";

const packet = parseKasandrinosPacket(rawPacket);
const assessment = assessKasandrinosIntake(packet);

function named(test: string) {
  const lot = packet.namedLots.find((item) => item.test === test);
  if (!lot) throw new Error(`missing named lot ${test}`);
  return lot;
}

function pending(test: string) {
  const certificate = packet.pendingLotIdCertificates.find((item) => item.test === test);
  if (!certificate) throw new Error(`missing pending certificate ${test}`);
  return certificate;
}

function analyte(test: string, name: string) {
  const source = [...packet.namedLots, ...packet.pendingLotIdCertificates].find((item) => item.test === test);
  const row = source?.analytes.find((item) => item.analyte === name);
  if (!row) throw new Error(`missing ${name} on ${test}`);
  return row;
}

describe("Kasandrinos Light Labs intake", () => {
  it("stops both named lots before nomination and writes nothing", () => {
    expect(assessment.databaseWrite).toBe(false);
    expect(assessment.persistedRecords).toBe(0);
    for (const record of assessment.records) {
      expect(record.lotStatus).toBeNull();
      expect(record.qualified).toBe(false);
      expect(record.reserved).toBe(false);
      expect(record.listed).toBe(false);
      expect(record.attachedToPhysicalLot).toBe(false);
      expect(record.heavyMetalStatusClaim).toBe("not_claimable");
    }
    expect(assessment.records.filter((record) => record.disposition === "withheld_before_nomination").map((record) => record.supplierLotCode)).toEqual(["227 K/B", "228 K/B"]);
  });

  it("keeps the primary heavy-metals panel exact and unclaimed", () => {
    const lot = named("43301");
    const record = assessment.records.find((item) => item.test === "43301");
    expect(lot.supplierLotCode).toBe("227 K/B");
    expect(lot.order).toBe("2485");
    expect(lot.dateReceived).toBe("2026-01-26");
    expect(lot.dateTested).toBe("2026-01-27");
    expect(lot.dateReleasedAsPrinted).toBe("01/27/2026");
    expect(lot.method).toBe("LLMTDA");
    expect(lot.methodStatement).toContain("ISO 17025");
    expect(lot.methodStatement).toContain("ananlytical");
    expect(analyte("43301", "Arsenic")).toMatchObject({ loq: "1.81 ppb", lightLabsSpecLimit: "740.74 ppb", result: "ND" });
    expect(analyte("43301", "Cadmium")).toMatchObject({ loq: "0.32 ppb", lightLabsSpecLimit: "303.7 ppb", result: "ND" });
    expect(analyte("43301", "Lead")).toMatchObject({ loq: "5.12 ppb", lightLabsSpecLimit: "37.04 ppb", result: "ND" });
    expect(analyte("43301", "Mercury")).toMatchObject({ loq: "1.97 ppb", lightLabsSpecLimit: "22.22 ppb", result: "ND" });
    expect(record?.heavyMetalPanelOnCertificate).toBe(true);
    expect(record?.disposition).toBe("withheld_before_nomination");
  });

  it("records lot 228 as aluminum only", () => {
    const lot = named("43297");
    expect(lot.supplierLotCode).toBe("228 K/B");
    expect(lot.dateTested).toBe("2026-01-29");
    expect(lot.dateReleasedAsPrinted).toBe("01/29/2026");
    expect(lot.analytes.map((row) => row.analyte)).toEqual(["Aluminum"]);
    expect(analyte("43297", "Aluminum").loq).toBe("270.44 ppb");
    expect(analyte("43297", "Aluminum").lightLabsSpecLimit).toBeNull();
    expect(analyte("43297", "Aluminum").resultExpressions).toEqual(["ND", "ND", "< 3.65 \u03bcg/serving"]);
    expect(assessment.records.find((item) => item.test === "43297")?.heavyMetalPanelOnCertificate).toBe(false);
  });

  it("keeps July 2025 certificates off every lot", () => {
    expect(packet.pendingLotIdCertificates.map((item) => item.supplierLotCode)).toEqual([null, null, null, null, null, null]);
    expect(assessment.records.filter((record) => record.order === "1670").every((record) => record.disposition === "withheld_pending_supplier_lot_id")).toBe(true);
    expect(analyte("13693", "Cadmium").loq).toBe("0.6 ppb");
    expect(analyte("13676", "Mercury").result).toBe("< 3.17 ppb (< 0.04 \u03bcg/serving)");
    expect(analyte("13676", "Arsenic").result).toBe("ND");
    expect(analyte("13692", "Lead").loq).toBe("9.44 ppb");
    expect(analyte("13691", "Aluminum").loq).toBe("520.85 ppb");
    expect(analyte("13691", "Aluminum").resultExpressions?.[0]).toBe("< 520.8511 ppb");
    expect(analyte("13691", "Aluminum").resultExpressions?.[1]).toBe("< 0.5209 \u03bcg/g");
    expect(analyte("13691", "Aluminum").resultExpressions?.[2]).toBe("< 7.03 \u03bcg/serving");
    expect(analyte("13679", "Glyphosate").concentration).toBe("ND");
    expect(analyte("13679", "AMPA").concentration).toBe("ND");
    expect(analyte("13679", "Glyphosate").perServingColumn).toBe("Concentration (\u00b5g/serving)");
    expect(analyte("13680", "Dibutyl phthalate").result).toBe("24 ppb");
    expect(analyte("13680", "Diethylhexyl Adipate").result).toBe("142 ppb");
    expect(analyte("13680", "Bis (2-ethylhexyl) phthalate").result).toBe("144 ppb");
    expect(pending("13680").analytes).toHaveLength(23);
    expect(pending("13680").approvedByLine).toBe("Principal Scientist");
    expect(named("43297").methodStatement).toBeNull();
  });

  it("prints the gate without promoting a lot state", () => {
    const report = formatKasandrinosIntakeReport(packet, assessment);
    expect(report).toContain("stopped before nomination");
    expect(report).toContain("waiting on a supplier lot id");
    expect(report).toContain("1.81 ppb");
    expect(report).toContain("not a VLE compliance-profile limit");
    expect(report).not.toMatch(/QUALIFIED|LISTED|RESERVED/);
  });

  it("does not connect the ops script to the database", () => {
    const source = readFileSync(new URL("../../../scripts/assess-kasandrinos-intake.ts", import.meta.url), "utf8");
    expect(source).not.toContain("getDb");
    expect(source).not.toContain("seed");
  });
});
