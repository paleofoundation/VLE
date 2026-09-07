import type { Metadata } from "next";
import Link from "next/link";
import { ExampleProfileNotice } from "../example-profile-notice";
import { PilotStatusRail } from "../pilot-status-rail";

export const metadata: Metadata = {
  title: "For laboratories — from controlled sample to authenticated evidence | VLE",
  description: "See how laboratories support VLE with controlled sample receipt and TECRID-authenticated evidence without turning a supplier PDF into a qualification decision.",
};

const steps = [
  {
    number: "01",
    phase: "Receive",
    title: "Receive the identified sample",
    summary: "Work from the sample and custody record—not from a generic product or loose document.",
    detail: "The laboratory receives a sealed Sample with its own identity, collection context, and custody events. VLE keeps the Sample distinct from the supplier's PhysicalLot and inventory assertions.",
    signal: "Sample identity + custody",
  },
  {
    number: "02",
    phase: "Receive",
    title: "Confirm custody before results",
    summary: "A result cannot repair a broken sample handoff.",
    detail: "Receipt, seal condition, and permitted custody transitions must be recorded before the sampling workflow completes. Missing or conflicting linkage stops the evidence path for that lot.",
    signal: "Controlled receipt",
  },
  {
    number: "03",
    phase: "Evidence",
    title: "Issue structured evidence through TECRID",
    summary: "Evidence must be authenticated and bound to the received sample.",
    detail: "TECRID authenticates the evidence envelope, issuer, timestamps, results, and sample binding under its contract. Live credentials remain a launch dependency and are not simulated in production.",
    signal: "Authenticated evidence",
  },
  {
    number: "04",
    phase: "Evidence",
    title: "Keep the laboratory result separate from the decision",
    summary: "The laboratory reports evidence. VLE applies the frozen Profile rules.",
    detail: "VLE checks current authenticated results against one named, frozen Compliance Profile version and records the deterministic QualificationDecision as a separate immutable record.",
    signal: "Evidence ≠ decision",
  },
  {
    number: "05",
    phase: "Monitor",
    title: "Let evidence status control publication",
    summary: "Expiry, revocation, or supersession must reach the listing gate.",
    detail: "A lot can appear publicly only while its evidence is current and the rest of the lot-specific gate remains clear. A changed evidence state withdraws eligibility; it does not rewrite history.",
    signal: "Current evidence only",
  },
] as const;

const evidenceChecks = [
  "Distinct Sample identity",
  "Completed custody and laboratory receipt",
  "Authenticated TECRID evidence envelope",
  "Results bound to the received Sample",
  "Current status and explicit evidence lifetime",
] as const;

export default function ForLaboratoriesPage() {
  return (
    <main id="main-content" className="supplierWalkthrough laboratoryWalkthrough">
      <div className="supplierScreen">
        <section className="supplierHero">
          <div className="supplierHeroCopy">
            <p className="eyebrow eyebrowLight">Laboratory walkthrough · Managed pilot</p>
            <h1>From controlled sample to trusted evidence.</h1>
            <p className="heroLead">Receive the right sample, preserve custody, and return authenticated evidence without asking a document to prove more than it can.</p>
            <div className="actions">
              <Link className="button" href="#laboratory-path">Walk the five steps</Link>
              <Link className="textLink textLinkLight" href="/access">Request access</Link>
            </div>
          </div>
          <aside className="supplierRouteCard" aria-label="Laboratory route summary">
            <div className="supplierRouteHead"><span className="signal"><i /> Pilot evidence route</span><span className="mono">LAB / 01</span></div>
            <ol>
              <li><span>01</span><div><strong>Receive</strong><small>Sample + custody</small></div></li>
              <li><span>02</span><div><strong>Evidence</strong><small>Test + authenticate</small></div></li>
              <li><span>03</span><div><strong>Monitor</strong><small>Current status</small></div></li>
            </ol>
            <p>Cocoa powder + avocado fruit readiness. Live TECRID credentials remain locked until the signed production contract is complete.</p>
          </aside>
        </section>

        <ExampleProfileNotice />
        <PilotStatusRail audience="laboratory" />

        <section className="supplierIdentity" aria-labelledby="laboratory-identity-heading">
          <div>
            <p className="eyebrow">Keep the evidence chain honest</p>
            <h2 id="laboratory-identity-heading">A PDF does not auto-QUALIFY a lot.</h2>
            <p>A supplier PDF or COA may provide background context. It does not prove controlled sampling, custody, TECRID authentication, inventory authority, or a QualificationDecision.</p>
          </div>
          <div className="identityRail" aria-label="Distinct laboratory and qualification records">
            <span>PhysicalLot</span><i aria-hidden="true">≠</i><span>Sample</span><i aria-hidden="true">≠</i><span>TECRID evidence</span><i aria-hidden="true">≠</i><span>QUALIFIED</span>
          </div>
          <p className="identityBoundary"><strong>The laboratory supplies results; TECRID authenticates the evidence; VLE makes the deterministic profile decision.</strong> No uploaded PDF, filename, or human review can bypass those separate controls.</p>
        </section>

        <section className="supplierPath" id="laboratory-path" aria-labelledby="laboratory-path-heading">
          <div className="supplierPathHeading">
            <div><p className="eyebrow">Receive → Evidence → Monitor</p><h2 id="laboratory-path-heading">One sample. Five controlled steps.</h2></div>
            <p>Each handoff preserves a distinct record. Evidence supports a decision only when the sample binding and authentication contract are intact.</p>
          </div>
          <ol className="supplierStepList">
            {steps.map((step) => (
              <li key={step.number}>
                <div className="supplierStepMarker"><span>{step.number}</span><small>{step.phase}</small></div>
                <div className="supplierStepCopy"><p>{step.summary}</p><h3>{step.title}</h3><p>{step.detail}</p></div>
                <div className="supplierStepSignal"><span className="mono">EVIDENCE CONTROL</span><strong>{step.signal}</strong></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="supplierGate" aria-labelledby="laboratory-gate-heading">
          <div className="supplierGateCopy">
            <p className="eyebrow eyebrowLight">Evidence gate</p>
            <h2 id="laboratory-gate-heading">Nothing qualifies on upload.</h2>
            <p>The lane waits for controlled sampling, authenticated structured evidence, and a separate deterministic decision against the frozen Profile version.</p>
            <blockquote>“Passed Compliance Profile X.”</blockquote>
            <small>VLE may make this claim only for the identified physical lot after the complete gate clears. It is not a laboratory certification of a finished product.</small>
          </div>
          <ol className="supplierGateFacts">
            {evidenceChecks.map((fact, index) => <li key={fact}><span>{String(index + 1).padStart(2, "0")}</span><strong>{fact}</strong></li>)}
          </ol>
        </section>

        <section className="supplierClose">
          <div><p className="eyebrow">Laboratory onboarding</p><h2>Bring the evidence capability. VLE preserves the boundary.</h2><p>The pilot access gate maps each signed-in identity to a reviewed organization and role. Laboratory production integration waits for the live TECRID contract and credentials.</p></div>
          <div className="supplierCloseActions"><Link className="button" href="/access">Open access</Link><Link className="textLink" href="/for-suppliers">See the supplier path</Link></div>
        </section>
      </div>
    </main>
  );
}
