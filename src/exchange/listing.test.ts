import { describe, expect, it } from "vitest";
import { DRAFT_AWAITING_COA, isPublishedProduct, type ExchangeLot } from "./listing";

describe("publication requires a COA on a specific lot", () => {
  it("keeps a product with no lots as a draft", () => {
    expect(isPublishedProduct([])).toBe(false);
  });

  it("keeps a lot with no COA as a draft", () => {
    const lots: ExchangeLot[] = [{ id: "lot-1", coa: null }];
    expect(isPublishedProduct(lots)).toBe(false);
  });

  it("rejects a COA that points at a different lot", () => {
    const lots: ExchangeLot[] = [{ id: "lot-1", coa: { id: "coa-1", lotId: "lot-2" } }];
    expect(isPublishedProduct(lots)).toBe(false);
  });

  it("publishes when a COA is attached to that lot", () => {
    const lots: ExchangeLot[] = [{ id: "lot-1", coa: { id: "coa-1", lotId: "lot-1" } }];
    expect(isPublishedProduct(lots)).toBe(true);
  });

  it("uses the draft label exactly", () => {
    expect(DRAFT_AWAITING_COA).toBe("Draft preview: awaiting COA");
  });
});
