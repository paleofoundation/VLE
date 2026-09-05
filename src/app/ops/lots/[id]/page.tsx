import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentActor } from "@/lib/current-actor";
import { getOpsLotWorkflow } from "@/services/vle";
import { advanceSamplingAction, holdLotAction, issueMockEvidenceAction, publishAction, qualifyAction, revokeEvidenceAction, startSamplingAction, verifyInventoryAction } from "../../actions";

const nextSampling = { REQUESTED: "SCHEDULED", SCHEDULED: "COLLECTED", COLLECTED: "SHIPPED", SHIPPED: "RECEIVED", RECEIVED: "COMPLETED" } as const;

function ActionForm({ action, fields, label, danger = false }: { action: (data: FormData) => Promise<void>; fields: Record<string, string>; label: string; danger?: boolean }) {
  return <form action={action}>{Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}<button className={danger ? "button danger" : "button"} type="submit">{label}</button></form>;
}

export const dynamic = "force-dynamic";

export default async function OpsLotPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentActor();
  if (!actor.roles.some((role) => role === "OPS" || role === "ADMIN")) {
    return <main className="narrow"><div className="notice"><strong>Operations access required</strong><p>Your VLE organization membership does not include an operations role.</p></div></main>;
  }
  const { id } = await params; const workflow = await getOpsLotWorkflow(id); if (!workflow) notFound();
  const { lot, order, sample, evidence, decision, listing, profile } = workflow;
  const inventoryVerified = Boolean(lot.identityConfirmedAt && lot.quantityVerifiedAt && lot.locationVerifiedAt && lot.authorityToSellVerifiedAt);
  const next = order && order.status in nextSampling ? nextSampling[order.status as keyof typeof nextSampling] : null;
  return <main className="narrow opsDetail">
    <Link className="back" href="/ops">← Control room</Link><p className="eyebrow">{workflow.product} · {workflow.supplier}</p><h1>{lot.supplierLotCode}</h1>
    <div className="workflowRail">
      <section><div><span>1</span><h2>Physical lot & inventory</h2></div><p>{lot.quantity} {lot.quantityUnit} · {lot.locationName}, {lot.countryCode}</p><p className="muted">Identity / quantity / location / authority: {inventoryVerified ? "verified" : "pending"}</p>{!inventoryVerified && <ActionForm action={verifyInventoryAction} fields={{ lotId: lot.id }} label="Verify inventory facts" />}</section>
      <section><div><span>2</span><h2>Sampling order</h2></div>{!order ? <><p>No sampling order.</p><ActionForm action={startSamplingAction} fields={{ lotId: lot.id }} label="Create sampling order" /></> : <><p>Status: <b>{order.status}</b></p>{next && <ActionForm action={advanceSamplingAction} fields={{ lotId: lot.id, orderId: order.id, to: next }} label={`Advance to ${next}`} />}</>}</section>
      <section><div><span>3</span><h2>Sample</h2></div>{sample ? <><p>{sample.sampleCode}</p><p className="muted">{sample.method} · {sample.samplerName}</p></> : <p>Created only at recorded collection.</p>}</section>
      <section><div><span>4</span><h2>TECRID-linked evidence</h2></div>{evidence ? <><p>{evidence.tecridId} · <b>{evidence.status}</b></p><p className="muted">Issuer: {evidence.issuer} · expires {evidence.expiresAt.toLocaleDateString()}</p></> : order?.status === "COMPLETED" && sample ? <ActionForm action={issueMockEvidenceAction} fields={{ lotId: lot.id, sampleId: sample.id, sampleCode: sample.sampleCode }} label="Issue & verify local mock TECRID" /> : <p>Available after sampling completes.</p>}</section>
      <section><div><span>5</span><h2>Qualification decision</h2></div>{decision ? <><p><b>{decision.outcome}</b> against frozen profile {profile?.version}</p><p className="muted">Immutable decision · engine {decision.engineVersion}</p></> : evidence && profile ? <ActionForm action={qualifyAction} fields={{ lotId: lot.id, evidenceId: evidence.id, profileVersionId: profile.id }} label="Run deterministic qualification" /> : <p>Waiting for current evidence and frozen profile.</p>}</section>
      <section><div><span>6</span><h2>Marketplace listing</h2></div>{listing ? <><p><b>{listing.status}</b> · {listing.publicSlug}</p>{listing.status === "LISTED" && evidence && <div className="buttonRow"><ActionForm action={revokeEvidenceAction} fields={{ lotId: lot.id, evidenceId: evidence.id }} label="Revoke evidence & unlist" danger /><ActionForm action={holdLotAction} fields={{ lotId: lot.id }} label="Hold lot & unlist" danger /></div>}</> : decision?.outcome === "QUALIFIED" ? <ActionForm action={publishAction} fields={{ lotId: lot.id, decisionId: decision.id }} label="Publish passed lot" /> : <p>Publication gate remains closed.</p>}</section>
    </div>
  </main>;
}
