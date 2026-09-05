import { describe, expect, it } from "vitest";
import { assertLotTransition } from "../lot-state";
import { assertSamplingTransition } from "../sampling";

describe("state machines", () => {
  it("permits the sampling custody sequence", () => expect(() => { assertSamplingTransition("REQUESTED", "SCHEDULED"); assertSamplingTransition("SCHEDULED", "COLLECTED"); assertSamplingTransition("COLLECTED", "SHIPPED"); assertSamplingTransition("SHIPPED", "RECEIVED"); assertSamplingTransition("RECEIVED", "COMPLETED"); }).not.toThrow());
  it("prohibits skipping sample collection", () => expect(() => assertSamplingTransition("SCHEDULED", "COMPLETED")).toThrowError(/cannot transition/));
  it("prohibits reopening cancelled sampling", () => expect(() => assertSamplingTransition("CANCELLED", "SCHEDULED")).toThrowError(/cannot transition/));
  it("permits the lot qualification sequence", () => expect(() => { assertLotTransition("NOMINATED", "SAMPLING"); assertLotTransition("SAMPLING", "EVIDENCE_RECEIVED"); assertLotTransition("EVIDENCE_RECEIVED", "QUALIFIED"); }).not.toThrow());
  it("prohibits direct nomination-to-qualification", () => expect(() => assertLotTransition("NOMINATED", "QUALIFIED")).toThrowError(/cannot transition/));
  it("makes revoked lots terminal", () => expect(() => assertLotTransition("REVOKED", "QUALIFIED")).toThrowError(/cannot transition/));
});
