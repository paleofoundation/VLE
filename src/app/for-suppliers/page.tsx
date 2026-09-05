import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "For suppliers — from stocked lot to passed-lot listing | VLE",
  description: "See how VLE moves an identified ingredient lot through sampling, TECRID-linked evidence, deterministic qualification, and gated commercial intent.",
};

const steps = [
  {
    number: "01",
    phase: "Rescue",
    title: "Nominate the physical lot",
    summary: "Start with inventory that exists—not a generic product page.",
    detail: "VLE records the supplier lot code, quantity, location, owner, and authority to sell. Those facts belong to one PhysicalLot and must be verified before sampling begins.",
    signal: "Identity + inventory authority",
  },
  {
    number: "02",
    phase: "Rescue",
    title: "Bind a controlled sample",
    summary: "A PDF or COA can describe results. It is not the lot.",
    detail: "An ops-driven SamplingOrder moves through a controlled sequence. The resulting Sample carries its own identity and custody record, bound to the nominated physical lot.",
    signal: "Sample + custody record",
  },
  {
    number: "03",
    phase: "Spot",
    title: "Authenticate evidence, then decide",
    summary: "TECRID-linked evidence enters a deterministic qualification—not a marketing review.",
    detail: "TECRID authenticates the evidence envelope and sample binding. VLE separately evaluates current results against one frozen Compliance Profile version and records an immutable decision.",
    signal: "TECRID + frozen profile",
  },
  {
    number: "04",
    phase: "Spot",
    title: "List only while the gate is clear",
    summary: "QUALIFIED is necessary. Current eligibility is what keeps the lot public.",
    detail: "A listing appears only after identity, inventory authority, sampling, current evidence, and a QUALIFIED decision align. Revoke, expiry, hold, transformation, or depletion automatically removes it.",
    signal: "Passed Compliance Profile X",
  },
  {
    number: "05",
    phase: "Reserve",
    title: "Record commercial intent",
    summary: "A quote and ReservationIntent can follow a live match. Neither is an Order.",
    detail: "Cocoa buyer requirements may match only an eligible LISTED lot on the same frozen profile. Quotes and reservation intents expire, and an unlisted lot invalidates the commercial path.",
    signal: "Intent follows eligibility",
  },
] as const;

const gateFacts = [
  "Named physical lot",
  "Verified quantity, location, and authority to sell",
  "Sampling and custody record",
  "Current TECRID-linked evidence",
  "QUALIFIED decision against a frozen profile version",
] as const;

export default function ForSuppliersPage() {
  return (
    <main id="main-content" className="supplierWalkthrough">
      <div className="supplierScreen">
        <section className="supplierHero">
          <div className="supplierHeroCopy">
            <p className="eyebrow eyebrowLight">Supplier walkthrough · Managed pilot</p>
            <h1>From stocked lot to visible proof.</h1>
            <p className="heroLead">Rescue the value in a real ingredient lot, make its qualification visible, and reach commercial intent without asking a buyer to trust a PDF.</p>
            <div className="actions">
              <Link className="button" href="#supplier-path">Walk the five steps</Link>
              <PrintButton />
            </div>
          </div>
          <aside className="supplierRouteCard" aria-label="Supplier route summary">
            <div className="supplierRouteHead"><span className="signal"><i /> Pilot route open</span><span className="mono">LOT / 01</span></div>
            <ol>
              <li><span>01</span><div><strong>Rescue</strong><small>Identify + sample</small></div></li>
              <li><span>02</span><div><strong>Spot</strong><small>Qualify + list</small></div></li>
              <li><span>03</span><div><strong>Reserve</strong><small>Quote + intent</small></div></li>
            </ol>
            <p>Cocoa powder pilot · avocado fruit readiness. Commercial matching remains cocoa-only.</p>
          </aside>
        </section>

        <section className="supplierIdentity" aria-labelledby="supplier-identity-heading">
          <div>
            <p className="eyebrow">Start with the right unit</p>
            <h2 id="supplier-identity-heading">The lot is not the document.</h2>
            <p>A product describes a kind of ingredient. A PhysicalLot identifies the inventory being offered. A Sample is material collected from that lot. TECRID authenticates the evidence envelope tied to the sample.</p>
          </div>
          <div className="identityRail" aria-label="Distinct compliance records">
            <span>Product</span><i aria-hidden="true">≠</i><span>PhysicalLot</span><i aria-hidden="true">≠</i><span>Sample</span><i aria-hidden="true">≠</i><span>TECRID</span>
          </div>
          <p className="identityBoundary"><strong>A supplier PDF or COA alone is not proof of sampling, inventory, ownership, or authority to sell.</strong> TECRID authenticates evidence; VLE keeps the other facts distinct and auditable.</p>
        </section>

        <section className="supplierPath" id="supplier-path" aria-labelledby="supplier-path-heading">
          <div className="supplierPathHeading">
            <div><p className="eyebrow">Rescue → Spot → Reserve</p><h2 id="supplier-path-heading">One lot. Five controlled steps.</h2></div>
            <p>Each step creates or verifies a distinct record. A later commercial action never repairs a missing compliance fact or keeps a dead listing alive.</p>
          </div>
          <ol className="supplierStepList">
            {steps.map((step) => (
              <li key={step.number}>
                <div className="supplierStepMarker"><span>{step.number}</span><small>{step.phase}</small></div>
                <div className="supplierStepCopy"><p>{step.summary}</p><h3>{step.title}</h3><p>{step.detail}</p></div>
                <div className="supplierStepSignal"><span className="mono">GATE SIGNAL</span><strong>{step.signal}</strong></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="supplierGate" aria-labelledby="supplier-gate-heading">
          <div className="supplierGateCopy">
            <p className="eyebrow eyebrowLight">Publication gate</p>
            <h2 id="supplier-gate-heading">Nothing appears early.</h2>
            <p>VLE is ready to populate, but a shelf stays empty until the full lot-specific chain is present and current.</p>
            <blockquote>“Passed Compliance Profile X.”</blockquote>
            <small>The claim applies only to the identified lot and frozen profile version. It is not a finished-product certification.</small>
          </div>
          <ol className="supplierGateFacts">
            {gateFacts.map((fact, index) => <li key={fact}><span>{String(index + 1).padStart(2, "0")}</span><strong>{fact}</strong></li>)}
          </ol>
        </section>

        <section className="supplierClose">
          <div><p className="eyebrow">Pilot intake</p><h2>Bring the lot. VLE runs the lane.</h2><p>Managed operations can take a nominated cocoa powder or avocado fruit lot through inventory verification, sampling, evidence, qualification, and gated publication. Buyer matching remains cocoa-only.</p></div>
          <div className="supplierCloseActions"><Link className="button" href="/supplier">Open supplier desk</Link><Link className="textLink" href="/">Inspect the public shelf</Link></div>
        </section>
      </div>

      <section className="supplierPrintSheet" aria-label="Printable supplier walkthrough">
        <header><span className="mono">VLE / SUPPLIER ONE-PAGER</span><h1>From stocked lot to visible proof.</h1><p>Rescue → Spot → Reserve</p></header>
        <p className="printPremise"><strong>Lot ≠ PDF/COA.</strong> A document may carry results; VLE binds authenticated evidence to a controlled sample, one physical lot, and a frozen Compliance Profile version.</p>
        <ol>{steps.map((step) => <li key={step.number}><span>{step.number}</span><div><small>{step.phase}</small><strong>{step.title}</strong><p>{step.summary}</p></div></li>)}</ol>
        <footer><strong>Public claim: “Passed Compliance Profile X.”</strong><p>Only while lot identity, inventory authority, sampling, current TECRID-linked evidence, and a QUALIFIED decision remain eligible. ReservationIntent ≠ Order. vle.exchange</p></footer>
      </section>
    </main>
  );
}
