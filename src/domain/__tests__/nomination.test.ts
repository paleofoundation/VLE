import { describe, expect, it } from "vitest";
import { assertNominationDraftEditable } from "../nomination";

const editable = {
  status: "NOMINATED" as const,
  identityConfirmedAt: null,
  quantityVerifiedAt: null,
  locationVerifiedAt: null,
  authorityToSellVerifiedAt: null,
  hasSamplingOrder: false,
};

describe("nomination draft state", () => {
  it("allows an untouched NOMINATED physical-lot draft to be corrected", () => {
    expect(() => assertNominationDraftEditable(editable)).not.toThrow();
  });

  it("prohibits edits after the lot leaves NOMINATED", () => {
    expect(() => assertNominationDraftEditable({ ...editable, status: "SAMPLING" })).toThrowError(/Only a NOMINATED/);
  });

  it("prohibits edits after any verification fact or sampling record exists", () => {
    expect(() => assertNominationDraftEditable({ ...editable, authorityToSellVerifiedAt: new Date() })).toThrowError(/after verification/);
    expect(() => assertNominationDraftEditable({ ...editable, hasSamplingOrder: true })).toThrowError(/after verification or sampling/);
  });
});
