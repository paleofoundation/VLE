import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentActor } from "@/lib/current-actor";
import { formatQuantity } from "@/lib/presentation";
import { getOpsLotWorkflow } from "@/services/vle";
import { advanceSamplingAction, holdLotAction, issueMockEvidenceAction, publishAction, qualifyAction, revokeEvidenceAction, startSamplingAction, verifyInventoryAction } from "../../actions";

const nextSampling = { REQUESTED: "SCHEDULED", SCHEDULED: "COLLECTED", COLLECTED: "SHIPPED", SHIPPED: "RECEIVED", RECEIVED: "COMPLETED" } as const;

function ActionForm({ action, fields, label, danger = false }: { action: (data: FormData) => Promise<void>; fields: Record<string, string>; label: string; danger?: boolean }) {
  return <form action={action}>{Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}<button className={danger ? "button buttonDanger" : "button"} type="submit">{label}</button></form>;
}

function stepClass(done: boolean, active: boolean) {
  return done ? "workflowStep isDone" : active ? "workflowStep isActive" : "workflowStep isLocked";
}

export const dynamic = "force-dynamic";

export default async function OpsLotPage({ params }: PageProps<"/ops/lots/[id]">) {
  const actor = await getCurrentActor();
  if (!actor.roles.some((role) => role === "OPS" || role === "ADMIN")) {
    return <main id="main-content" className="accessPage"><div className="accessCard"><span className="mono">AUTHZ / OPS</span><h1>Operations access required.</h1><p>Your active VLE organization membership does not include an operations role.</p><Link className="textLink" href="/">Return to the public shelf</Link></div></main>;
  }

  const { id } = await params;
  const workflow = await getOpsLotWorkflow(id);
  if (!workflow) notFound();

  const { lot, order, sample, evidence, decision, listing, profile } = workflow;
  const inventoryVerified = Boolean(lot.identityConfirmedAt && lot.quantityVerifiedAt && lot.locationVerifiedAt && lot.authorityToSellVerifiedAt);
  const samplingComplete = order?.status === "COMPLETED";
  const next = order && order.status in nextSampling ? nextSampling[order.status as keyof typeof nextSampling] : null;
  const evidenceCurrent = evidence?.status === "CURRENT" && evidence.expiresAt > new Date();
  const decisionComplete = Boolean(decision);
  const listingComplete = listing?.status === "LISTED";
  const completedCount = [inventoryVerified, samplingComplete, Boolean(sample), evidenceCurrent, decisionComplete, listingComplete].filter(Boolean).length;

  return (
    <main id="main-content" className="opsDetailPage">
      <div className="detailBreadcrumb"><Link className="back" href="/ops">Operations board</Link><span aria-hidden="true">/</span><span>{lot.supplierLotCode}</span></div>

      <section className="opsDetailHero">
        <div>
          <div className="opsLotFlags"><span className={`stateChip state-${lot.status.toLowerCase()}`}>{lot.status.replaceAll("_", " ")}</span>{lot.supplierLotCode.includes("DEMO-NOMINATED") && !["HELD", "REVOKED", "TRANSFORMED", "DEPLETED"].includes(lot.status) ? <span className="walkthroughChip">Walkthrough lane</span> : null}</div>
          <p className="eyebrow">{workflow.product} · {workflow.supplier}</p>
          <h1>{lot.supplierLotCode}</h1>
          <p className="sectionLead">One physical lot. One controlled sequence. Each action unlocks only after the prior evidence exists.</p>
        </div>
        <aside className="workflowSummary">
          <span>Truth spine</span>
          <strong>{completedCount} / 6</strong>
          <div className="progressTrack"><i style={{ width: `${(completedCount / 6) * 100}%` }} /></div>
          <small>{listingComplete ? "Public eligibility active" : "Publication gate not yet complete"}</small>
        </aside>
      </section>

      <div className="workflowLayout">
        <nav className="workflowIndex" aria-label="Lot workflow stages">
          <p className="eyebrow">Sequence</p>
          <ol>
            <li className={inventoryVerified ? "done" : "current"}><span>01</span>Inventory</li>
            <li className={samplingComplete ? "done" : inventoryVerified ? "current" : ""}><span>02</span>Sampling</li>
            <li className={sample ? "done" : ""}><span>03</span>Sample</li>
            <li className={evidenceCurrent ? "done" : samplingComplete ? "current" : ""}><span>04</span>TECRID</li>
            <li className={decisionComplete ? "done" : evidenceCurrent ? "current" : ""}><span>05</span>Decision</li>
            <li className={listingComplete ? "done" : decision?.outcome === "QUALIFIED" ? "current" : ""}><span>06</span>Listing</li>
          </ol>
        </nav>

        <div className="workflowRail">
          <section className={stepClass(inventoryVerified, !inventoryVerified)}>
            <div className="workflowStepHead"><span>01</span><div><small>Physical truth</small><h2>Lot identity & inventory</h2></div><b>{inventoryVerified ? "Complete" : "Required"}</b></div>
            <div className="workflowStepBody"><div><p className="stepValue">{formatQuantity(lot.quantity)} {lot.quantityUnit}</p><p>{lot.locationName}, {lot.countryCode} · owner recorded as {lot.ownerName}</p><p className="muted">Identity / quantity / location / authority: {inventoryVerified ? "verified" : "pending"}</p></div>{!inventoryVerified ? <ActionForm action={verifyInventoryAction} fields={{ lotId: lot.id }} label="Verify inventory facts" /> : null}</div>
          </section>

          <section className={stepClass(samplingComplete, inventoryVerified && !samplingComplete)}>
            <div className="workflowStepHead"><span>02</span><div><small>Controlled workflow</small><h2>Sampling order</h2></div><b>{order?.status ?? "Locked"}</b></div>
            <div className="workflowStepBody"><div>{!order ? <p>No sampling order is attached.</p> : <><p className="stepValue">{order.status}</p><p className="muted">Advance only through the permitted custody sequence.</p></>}</div>{!order && inventoryVerified ? <ActionForm action={startSamplingAction} fields={{ lotId: lot.id }} label="Create sampling order" /> : next ? <ActionForm action={advanceSamplingAction} fields={{ lotId: lot.id, orderId: order!.id, to: next }} label={`Advance to ${next}`} /> : null}</div>
          </section>

          <section className={stepClass(Boolean(sample), order?.status === "SCHEDULED")}>
            <div className="workflowStepHead"><span>03</span><div><small>Lot binding</small><h2>Physical sample</h2></div><b>{sample ? "Recorded" : "Waiting"}</b></div>
            <div className="workflowStepBody"><div>{sample ? <><p className="stepValue">{sample.sampleCode}</p><p>{sample.method} · {sample.samplerName}</p><p className="muted">Created at recorded collection and bound to this lot.</p></> : <p>The sample record is created only when collection is recorded.</p>}</div></div>
          </section>

          <section className={stepClass(evidenceCurrent, samplingComplete && !evidence)}>
            <div className="workflowStepHead"><span>04</span><div><small>Authenticated evidence</small><h2>TECRID linkage</h2></div><b>{evidence?.status ?? "Waiting"}</b></div>
            <div className="workflowStepBody"><div>{evidence ? <><p className="stepValue">{evidence.tecridId}</p><p>Issuer: {evidence.issuer}</p><p className="muted">Current through {evidence.expiresAt.toLocaleDateString("en", { day: "2-digit", month: "long", year: "numeric" })}</p></> : <p>Available after sampling and custody are complete.</p>}</div>{!evidence && samplingComplete && sample ? <ActionForm action={issueMockEvidenceAction} fields={{ lotId: lot.id, sampleId: sample.id, sampleCode: sample.sampleCode, productCode: workflow.productCode }} label="Issue & verify local mock TECRID" /> : null}</div>
          </section>

          <section className={stepClass(decisionComplete, evidenceCurrent && !decision)}>
            <div className="workflowStepHead"><span>05</span><div><small>Deterministic rules</small><h2>Qualification decision</h2></div><b>{decision?.outcome ?? "Waiting"}</b></div>
            <div className="workflowStepBody"><div>{decision ? <><p className="stepValue">{decision.outcome}</p><p>{profile?.profileName} v{profile?.version}</p><p className="muted">Immutable decision · engine {decision.engineVersion}</p></> : <><p>Current TECRID-linked evidence is required.</p><p className="muted">Qualification target ready: {profile?.profileName} v{profile?.version} · frozen.</p></>}</div>{!decision && evidence && profile ? <ActionForm action={qualifyAction} fields={{ lotId: lot.id, evidenceId: evidence.id, profileVersionId: profile.id }} label="Run deterministic qualification" /> : null}</div>
          </section>

          <section className={stepClass(listingComplete, decision?.outcome === "QUALIFIED" && !listingComplete)}>
            <div className="workflowStepHead"><span>06</span><div><small>Public eligibility</small><h2>Marketplace listing</h2></div><b>{listing?.status ?? "Gate closed"}</b></div>
            <div className="workflowStepBody"><div>{listing ? <><p className="stepValue">{listing.status}</p><p>{listing.publicSlug}</p><p className="muted">The public read independently re-checks eligibility.</p></> : <p>{decision?.outcome === "QUALIFIED" ? "All qualification inputs are ready for the publication gate." : "Only a QUALIFIED decision can reach this step."}</p>}</div>{!listing && decision?.outcome === "QUALIFIED" ? <ActionForm action={publishAction} fields={{ lotId: lot.id, decisionId: decision.id }} label="Publish passed lot" /> : listingComplete && evidence ? <div className="buttonRow"><ActionForm action={revokeEvidenceAction} fields={{ lotId: lot.id, evidenceId: evidence.id }} label="Revoke evidence & unlist" danger /><ActionForm action={holdLotAction} fields={{ lotId: lot.id }} label="Hold lot & unlist" danger /></div> : null}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
