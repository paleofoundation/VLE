import { describe, expect, it } from "vitest";
import { qualify } from "../qualification";

const profile = { id: "profile-v1", version: "1.0", status: "FROZEN" as const, rules: [
  { analyte: "lead" as const, maxPpm: 0.5 }, { analyte: "cadmium" as const, maxPpm: 0.8 },
] };
const now = new Date("2026-01-01T00:00:00Z");

function evidence(results: { analyte: "lead" | "cadmium"; valuePpm: number; unit: "ppm" }[], overrides = {}) {
  return { id: "evidence-1", status: "CURRENT" as const, issuedAt: new Date("2025-12-01T00:00:00Z"), expiresAt: new Date("2027-01-01T00:00:00Z"), results, ...overrides };
}

describe("deterministic qualification", () => {
  it("qualifies when every required result is at or below the frozen limit", () => {
    expect(qualify(profile, evidence([{ analyte: "lead", valuePpm: 0.5, unit: "ppm" }, { analyte: "cadmium", valuePpm: 0.4, unit: "ppm" }]), now).outcome).toBe("QUALIFIED");
  });
  it("does not qualify a failing result", () => {
    expect(qualify(profile, evidence([{ analyte: "lead", valuePpm: 0.51, unit: "ppm" }, { analyte: "cadmium", valuePpm: 0.4, unit: "ppm" }]), now).outcome).toBe("NOT_QUALIFIED");
  });
  it("reports insufficient evidence when a required analyte is missing", () => {
    expect(qualify(profile, evidence([{ analyte: "lead", valuePpm: 0.2, unit: "ppm" }]), now).outcome).toBe("INSUFFICIENT_EVIDENCE");
  });
  it("reports insufficient evidence when evidence is expired", () => {
    expect(qualify(profile, evidence([], { expiresAt: new Date("2025-01-01T00:00:00Z") }), now).outcome).toBe("INSUFFICIENT_EVIDENCE");
  });
  it("evaluates the avocado fruit EXAMPLE metals/Cd profile without changing the engine", () => {
    const avocadoProfile = { id: "avocado-profile-v1", version: "1.0", status: "FROZEN" as const, rules: [
      { analyte: "cadmium" as const, maxPpm: 0.05 }, { analyte: "lead" as const, maxPpm: 0.1 },
    ] };
    expect(qualify(avocadoProfile, evidence([
      { analyte: "cadmium", valuePpm: 0.02, unit: "ppm" }, { analyte: "lead", valuePpm: 0.04, unit: "ppm" },
    ]), now).outcome).toBe("QUALIFIED");
    expect(qualify(avocadoProfile, evidence([
      { analyte: "cadmium", valuePpm: 0.06, unit: "ppm" }, { analyte: "lead", valuePpm: 0.04, unit: "ppm" },
    ]), now).outcome).toBe("NOT_QUALIFIED");
  });
});
