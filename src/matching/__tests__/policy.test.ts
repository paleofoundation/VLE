import { describe, expect, it } from "vitest";
import { addDecimal, compareDecimal, loadMatchPolicy } from "../policy";
import { fakePolicy } from "./fixtures";

// Every numeric value in this suite is TEST-ONLY FAKE policy data.
describe("matching configuration fails closed", () => {
  it.each([undefined, null, {}, "FAKE_POLICY"])("has no default policy for %s", (config) => {
    expect(loadMatchPolicy(config)).toEqual({ enabled: false, reason: "No approved grade mapping" });
  });

  it("accepts a complete explicitly supplied TEST-ONLY FAKE configuration", () => {
    expect(loadMatchPolicy(fakePolicy()).enabled).toBe(true);
  });

  it.each(Object.keys(fakePolicy()))("requires the named setting %s", (key) => {
    const config = { ...fakePolicy() } as Record<string, unknown>;
    delete config[key];
    expect(loadMatchPolicy(config).enabled).toBe(false);
  });

  it.each(["NaN", "Infinity", "-1", "1e3", "01", "", "0"])("rejects an invalid bonus %s", (value) => {
    expect(loadMatchPolicy({ ...fakePolicy(), MATCH_WEIGHT_TECRID: value }).enabled).toBe(false);
  });

  it("rejects the superseded contamination weight instead of treating it as an ordering input", () => {
    expect(loadMatchPolicy({ ...fakePolicy(), MATCH_WEIGHT_CONTAMINATION: "1" }).enabled).toBe(false);
  });

  it.each([
    ["duplicate panel", (p: ReturnType<typeof fakePolicy>) => { p.MATCH_REQUIRED_ANALYTES.push("lead"); }],
    ["missing panel mapping", (p: ReturnType<typeof fakePolicy>) => { p.MATCH_STANDARD_MAPPING.pop(); }],
    ["missing grade utility", (p: ReturnType<typeof fakePolicy>) => { delete p.MATCH_GRADE_UTILITY.FAKE_A; }],
    ["reversed utilities", (p: ReturnType<typeof fakePolicy>) => { p.MATCH_GRADE_UTILITY.FAKE_A = "1"; }],
    ["equal utilities", (p: ReturnType<typeof fakePolicy>) => { p.MATCH_GRADE_UTILITY.FAKE_A = p.MATCH_GRADE_UTILITY.FAKE_B; }],
    ["reversed grade bounds", (p: ReturnType<typeof fakePolicy>) => { p.MATCH_STANDARD_MAPPING[0].grades[1].maxValue = "0.5"; }],
    ["duplicate grades", (p: ReturnType<typeof fakePolicy>) => { p.MATCH_STANDARD_MAPPING[0].grades[1].grade = "FAKE_A"; }],
    ["missing freshness authority", (p: ReturnType<typeof fakePolicy>) => { p.MATCH_VERIFICATION_FRESHNESS_POLICY.issuers = []; }],
    ["nonfinite freshness", (p: ReturnType<typeof fakePolicy>) => { p.MATCH_VERIFICATION_FRESHNESS_POLICY.maxAgeMs = Infinity; }],
    ["invalid source date", (p: ReturnType<typeof fakePolicy>) => { p.MATCH_STANDARD_MAPPING[0].effectiveAt = "FAKE_INVALID_DATE"; }],
  ] as const)("rejects %s", (_name, change) => {
    const policy = fakePolicy(); change(policy);
    expect(loadMatchPolicy(policy).enabled).toBe(false);
  });

  it("retains exact precision beyond binary floating-point resolution", () => {
    expect(compareDecimal("9007199254740993.01", "9007199254740993.00")).toBe(1);
    expect(compareDecimal("100.10", "100.1")).toBe(0);
    expect(addDecimal("2.50", "10000.25")).toBe("10002.75");
  });
});
