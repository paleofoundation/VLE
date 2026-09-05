import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For buyers — from requirement to reservation intent | VLE",
  description: "See how VLE connects a cocoa requirement to an eligible listing, a time-limited supplier quote, and a reservation intent.",
};

const steps = [
  {
    number: "01",
    phase: "Rescue",
    title: "Name what the lot must pass",
    summary: "Start with a compliance condition—not a catalog search.",
    detail: "Record the cocoa powder quantity, destination, and frozen Compliance Profile version. The BuyerRequirement preserves that standard before VLE considers a listing.",
    signal: "Requirement + frozen profile",
  },
  {
    number: "02",
    phase: "Rescue",
    title: "See only eligible physical lots",
    summary: "A product page or supplier COA is not a passing-lot match.",
    detail: "A public listing identifies stocked inventory with verified quantity, location, and authority to sell, plus controlled sampling, current TECRID-linked evidence, and a QUALIFIED decision.",
    signal: "Live publication gate",
  },
  {
    number: "03",
    phase: "Spot",
    title: "Match the requirement to the live shelf",
    summary: "The product and frozen profile version must agree exactly.",
    detail: "Managed operations can match a cocoa requirement only to a currently eligible LISTED lot. If that listing unlists, the match is invalidated instead of lingering as a stale option.",
    signal: "Eligible cocoa match",
  },
  {
    number: "04",
    phase: "Spot",
    title: "Evaluate a time-limited quote",
    summary: "Commercial terms arrive as their own expiring record.",
    detail: "The supplier sends a SupplierQuote for the matched lot. Acceptance records agreement with that quote; it does not alter qualification or create an Order.",
    signal: "Explicit quote expiry",
  },
  {
    number: "05",
    phase: "Reserve",
    title: "Record reservation intent",
    summary: "Hold the commercial thread without keeping a dead listing alive.",
    detail: "A ReservationIntent has its own expiry and remains distinct from an Order. It becomes invalid if the listing loses eligibility; payments and freight are outside this pilot lane.",
    signal: "Intent follows eligibility",
  },
] as const;

const buyerChecks = [
  "Currently public LISTED lot",
  "Same cocoa product and frozen profile version",
  "Current TECRID-linked evidence",
  "QUALIFIED decision remains eligible",
  "Quote and reservation intent remain within expiry",
] as const;

export default function ForBuyersPage() {
  return (
    <main id="main-content" className="supplierWalkthrough buyerWalkthrough">
      <div className="supplierScreen">
        <section className="supplierHero">
          <div className="supplierHeroCopy">
            <p className="eyebrow eyebrowLight">Buyer walkthrough · Cocoa powder pilot</p>
            <h1>From requirement to eligible lot.</h1>
            <p className="heroLead">Rescue the requirement, spot the eligible physical lot, and record reservation intent while eligibility is still live.</p>
            <div className="actions">
              <Link className="button" href="#buyer-path">Walk the five steps</Link>
              <Link className="textLink textLinkLight" href="/find">Record a requirement</Link>
            </div>
          </div>
          <aside className="supplierRouteCard" aria-label="Buyer route summary">
            <div className="supplierRouteHead"><span className="signal"><i /> Cocoa route open</span><span className="mono">BUY / 01</span></div>
            <ol>
              <li><span>01</span><div><strong>Rescue</strong><small>Define the condition</small></div></li>
              <li><span>02</span><div><strong>Spot</strong><small>Match + quote</small></div></li>
              <li><span>03</span><div><strong>Reserve</strong><small>Intent, not Order</small></div></li>
            </ol>
            <p>Matching is cocoa-only and eligibility-bound. Avocado fruit remains a qualification and publication readiness lane.</p>
          </aside>
        </section>

        <section className="supplierIdentity" aria-labelledby="buyer-identity-heading">
          <div>
            <p className="eyebrow">Keep the records distinct</p>
            <h2 id="buyer-identity-heading">A match is not a purchase.</h2>
            <p>The requirement says what must pass. The match points to an eligible listing. The quote states expiring commercial terms. The reservation records intent—and is still not an Order.</p>
          </div>
          <div className="identityRail" aria-label="Distinct buyer and commercial records">
            <span>Requirement</span><i aria-hidden="true">≠</i><span>Match</span><i aria-hidden="true">≠</i><span>Quote</span><i aria-hidden="true">≠</i><span>ReservationIntent</span>
          </div>
          <p className="identityBoundary"><strong>None of these records can repair or replace the compliance chain.</strong> If the physical lot is held, its evidence expires or is revoked, or another eligibility fact fails, the listing unlists and its match and reservation intent are invalidated.</p>
        </section>

        <section className="supplierPath" id="buyer-path" aria-labelledby="buyer-path-heading">
          <div className="supplierPathHeading">
            <div><p className="eyebrow">Rescue → Spot → Reserve</p><h2 id="buyer-path-heading">One requirement. Five controlled steps.</h2></div>
            <p>The buyer path can move only through currently eligible cocoa listings. Commercial records follow the compliance state; they never override it.</p>
          </div>
          <ol className="supplierStepList">
            {steps.map((step) => (
              <li key={step.number}>
                <div className="supplierStepMarker"><span>{step.number}</span><small>{step.phase}</small></div>
                <div className="supplierStepCopy"><p>{step.summary}</p><h3>{step.title}</h3><p>{step.detail}</p></div>
                <div className="supplierStepSignal"><span className="mono">CONTROL POINT</span><strong>{step.signal}</strong></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="supplierGate" aria-labelledby="buyer-gate-heading">
          <div className="supplierGateCopy">
            <p className="eyebrow eyebrowLight">Buyer-side truth</p>
            <h2 id="buyer-gate-heading">Eligibility travels forward.</h2>
            <p>A buyer sees a lot only while the complete lot-specific chain is present and current. Quote or reservation activity never freezes that status.</p>
            <blockquote>“Passed Compliance Profile X.”</blockquote>
            <small>The claim applies only to the identified physical lot and frozen profile version. It is not a finished-product certification or guarantee of supply.</small>
          </div>
          <ol className="supplierGateFacts">
            {buyerChecks.map((fact, index) => <li key={fact}><span>{String(index + 1).padStart(2, "0")}</span><strong>{fact}</strong></li>)}
          </ol>
        </section>

        <section className="supplierClose">
          <div><p className="eyebrow">Buyer intake</p><h2>Bring the requirement. VLE checks the live shelf.</h2><p>Record the cocoa quantity, destination, and frozen profile that must be met. Managed operations can run matching; suppliers can quote; buyers can record reservation intent. No Order, payment, or freight booking is created.</p></div>
          <div className="supplierCloseActions"><Link className="button" href="/find">Find a passing lot</Link><Link className="textLink" href="/buyer">Open buyer desk</Link></div>
        </section>
      </div>
    </main>
  );
}
