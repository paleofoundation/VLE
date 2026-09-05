import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For suppliers — Verified Lot Exchange",
  description: "A five-step supplier walkthrough from stocked physical lot to an eligible reservation intent.",
};

const supplierSteps = [
  {
    number: "01",
    phase: "Rescue",
    title: "Start with stocked inventory.",
    description:
      "Nominate a physical ingredient lot that exists now. VLE does not begin with a catalog page, a product family, or a promise to source later.",
    signal: "A real lot enters the lane",
  },
  {
    number: "02",
    phase: "Spot",
    title: "Make the lot identifiable.",
    description:
      "Give VLE the stocked lot code, available quantity, verified location, and the person authorized to offer it. Those facts stay attached to the same physical lot.",
    signal: "Identity + inventory authority",
  },
  {
    number: "03",
    phase: "Sample",
    title: "Let an independent sample speak.",
    description:
      "A managed sampling and custody record binds the tested material to the nominated lot. A supplier PDF or COA may add context, but it cannot qualify or list the lot on its own.",
    signal: "Independent sample + custody",
  },
  {
    number: "04",
    phase: "Prove",
    title: "Authenticate, then decide.",
    description:
      "Evidence is linked through TECRID and checked against one frozen compliance profile version. VLE records a deterministic decision; changed or revoked evidence removes listing eligibility.",
    signal: "TECRID + profile decision",
  },
  {
    number: "05",
    phase: "Reserve",
    title: "Offer only the lot that passed.",
    description:
      "A current QUALIFIED lot may appear on the public shelf and support a time-limited reservation intent. That is not an Order, payment, freight booking, or guarantee of supply.",
    signal: "Eligible listing + intent",
  },
] as const;

const supplierFacts = [
  ["Stocked lot code", "The identifier on the physical inventory"],
  ["Available quantity", "How much of that lot can be offered now"],
  ["Verified location", "Where the nominated inventory is held"],
  ["Authorizer", "Who has authority to offer the lot"],
] as const;

export default function ForSuppliersPage() {
  return (
    <main id="main-content" className="supplierPage">
      <section className="supplierHero" aria-labelledby="supplier-heading">
        <div className="supplierHeroCopy">
          <p className="eyebrow eyebrowLight">Supplier walkthrough · Five controlled steps</p>
          <h1 id="supplier-heading">Rescue the lot. Spot the proof. Reserve what passed.</h1>
          <p className="heroLead">
            VLE helps qualified inventory become visible without turning your product range into a catalog. The unit of trust is one stocked physical lot.
          </p>
          <div className="actions">
            <Link className="button" href="#supplier-walkthrough">Walk the five steps</Link>
            <Link className="textLink textLinkLight" href="/">See the public shelf</Link>
          </div>
        </div>

        <aside className="supplierEquation" aria-label="Physical lot and document distinction">
          <span className="mono">THE UNIT / LOT</span>
          <div className="supplierEquationLine">
            <strong>Physical lot</strong>
            <b aria-hidden="true">≠</b>
            <strong>PDF / COA</strong>
          </div>
          <p>Documents are background artifacts. Qualification requires the identified lot, controlled sampling, current authenticated evidence, and a recorded profile decision.</p>
        </aside>
      </section>

      <section className="supplierArc" id="supplier-walkthrough" aria-labelledby="walkthrough-heading">
        <div className="supplierArcHeading">
          <div>
            <p className="eyebrow">Rescue → Spot → Reserve</p>
            <h2 id="walkthrough-heading">One lot. One evidence trail. One bounded claim.</h2>
          </div>
          <p>Each step has a gate. A missing identity, inventory fact, sample link, evidence status, or qualification decision stops the lot before publication.</p>
        </div>

        <ol className="supplierJourney">
          {supplierSteps.map((step) => (
            <li className="supplierStep" key={step.number}>
              <div className="supplierStepMarker">
                <span>{step.number}</span>
                <i aria-hidden="true" />
              </div>
              <div className="supplierStepPhase">
                <span className="mono">{step.phase}</span>
                <small>{step.signal}</small>
              </div>
              <div className="supplierStepCopy">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="supplierHandoff" aria-labelledby="handoff-heading">
        <div className="supplierHandoffIntro">
          <p className="eyebrow">Your handoff to VLE</p>
          <h2 id="handoff-heading">Bring four inventory facts.</h2>
          <p>These facts let operations bind the nomination to inventory that can actually be sampled and offered. Product brochures and catalog entries are not substitutes.</p>
        </div>
        <dl className="supplierFactGrid">
          {supplierFacts.map(([term, detail], index) => (
            <div key={term}>
              <dt><span className="mono">0{index + 1}</span>{term}</dt>
              <dd>{detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="supplierClaimBoundary" aria-labelledby="claim-heading">
        <div className="supplierClaim">
          <p className="eyebrow eyebrowLight">The only VLE claim</p>
          <h2 id="claim-heading">“Passed Profile X.”</h2>
          <p>In practice, X is the named, frozen compliance profile and version tied to that physical lot’s current evidence.</p>
        </div>
        <div className="supplierClaimRules">
          <div>
            <span className="mono">WE CAN SAY</span>
            <strong>Passed the named profile</strong>
          </div>
          <div>
            <span className="mono">WE DO NOT SAY</span>
            <strong>Safe, clean, zero, or universally compliant</strong>
          </div>
          <p>If the evidence expires or is revoked, or the lot is held, depleted, transformed, or revoked, VLE withdraws the listing. A reservation intent never overrides eligibility.</p>
        </div>
      </section>

      <section className="supplierClose" aria-labelledby="supplier-close-heading">
        <div>
          <p className="eyebrow">Ready to nominate a lot?</p>
          <h2 id="supplier-close-heading">Start with the lot facts, not a catalog.</h2>
        </div>
        <div className="actions">
          <Link className="button buttonDark" href="/supplier">Open the supplier desk</Link>
          <Link className="textLink" href="/">Inspect passed lots</Link>
        </div>
      </section>
    </main>
  );
}
