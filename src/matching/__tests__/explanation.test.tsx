import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MatchResultExplanation, SupplierMatchExplanation } from "../explanation";
import { MATCH_METHODOLOGY_PATH, MATCH_TIE_COPY } from "../copy";
import { evaluateMatches } from "../engine";
import { FAKE_NOW, FAKE_REQUIREMENT, FAKE_VIEWER, fakeAdapter, fakeOffer, fakePolicy } from "./fixtures";

// TEST-ONLY FAKE policy, identities and results. No production data or limits.
async function fakeEvaluation() {
  const offers = [fakeOffer()];
  return evaluateMatches({
    requirement: FAKE_REQUIREMENT, viewer: FAKE_VIEWER, offers,
    config: fakePolicy(), now: FAKE_NOW,
  }, { tecrid: fakeAdapter(offers).adapter });
}

describe("matching result explanation", () => {
  it("shows the same evaluated lot, exact values and tie-only contributions without evidence links", async () => {
    const evaluation = await fakeEvaluation();
    const receipt = evaluation.ranked[0].best;
    const html = renderToStaticMarkup(createElement(MatchResultExplanation, { receipt }));
    expect(html).toContain("Offered lot FAKE_LOT_A");
    expect(html).toContain("100.10");
    expect(html).toContain("2.50");
    expect(html).toContain("0.5 ppm");
    expect(html).toContain("FAKE_BINDING_RECEIPT");
    expect(html).toContain("No regulatory limit mapped");
    expect(html).toContain(MATCH_TIE_COPY);
    expect(html).toContain(`href="${MATCH_METHODOLOGY_PATH}"`);
    expect(html.match(/href=/g)).toHaveLength(1);
    expect(html).not.toContain("MATCH_WEIGHT_CONTAMINATION");
    expect(html).not.toContain("resulting score");
  });

  it("does not render scores or ordinal ranks from an unrankable snapshot with stale score fields", async () => {
    const receipt = structuredClone((await fakeEvaluation()).ranked[0].best);
    receipt.outcome = "UNRANKABLE";
    receipt.reasons = ["Conflicting current evidence requires authoritative resolution"];
    const html = renderToStaticMarkup(createElement(MatchResultExplanation, { receipt }));
    expect(html).toContain("Not ranked");
    expect(html).toContain(receipt.reasons[0]);
    expect(html).not.toContain("Contamination utility Q");
    expect(html).not.toContain("Equal-grade tie contribution B");
    expect(html).not.toContain("Rank 1");
    expect(html).not.toContain("100.10");
  });

  it("renders nothing for an ineligible result", async () => {
    const receipt = structuredClone((await fakeEvaluation()).ranked[0].best);
    receipt.outcome = "INELIGIBLE";
    expect(renderToStaticMarkup(createElement(MatchResultExplanation, { receipt }))).toBe("");
  });

  it("keeps unavailable authorized evidence generic and omits any attached details", async () => {
    const receipt = structuredClone((await fakeEvaluation()).ranked[0].best);
    receipt.outcome = "UNRANKABLE";
    receipt.reasons = ["Authorized evidence unavailable", "FAKE_HIDDEN_DETAIL"];
    const html = renderToStaticMarkup(createElement(MatchResultExplanation, { receipt }));
    expect(html).toContain("Authorized evidence unavailable");
    expect(html).not.toContain("FAKE_HIDDEN_DETAIL");
    expect(html).not.toContain("FAKE_BINDING_RECEIPT");
    expect(html).not.toContain("FAKE_SAMPLE");
    expect(html).not.toContain("0.5 ppm");
  });

  it("labels other matching lots separately from the best offered lot", async () => {
    const group = structuredClone((await fakeEvaluation()).ranked[0]);
    const other = structuredClone(group.best);
    other.offer.id = "FAKE_OFFER_OTHER";
    other.offer.lotId = "FAKE_LOT_OTHER";
    other.rank = null;
    group.otherLots = [other];
    const html = renderToStaticMarkup(createElement(SupplierMatchExplanation, { group }));
    expect(html).toContain("Other eligible matching lots from this supplier");
    expect(html).toContain("Other matching offered lot");
    expect(html.match(/Best matching offered lot/g)).toHaveLength(1);
    expect(html).toContain("FAKE_LOT_OTHER");
  });
});
