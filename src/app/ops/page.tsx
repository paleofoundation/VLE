import Link from "next/link";
import { getCurrentActor } from "@/lib/current-actor";
import { formatQuantity } from "@/lib/presentation";
import { listAuditEvents, listOpsLots, listPilotLanes } from "@/services/vle";

export const dynamic = "force-dynamic";

type OpsLot = Awaited<ReturnType<typeof listOpsLots>>[number];

function inventoryVerified(lot: OpsLot) {
  return Boolean(lot.identityConfirmedAt && lot.quantityVerifiedAt && lot.locationVerifiedAt && lot.authorityToSellVerifiedAt);
}

function lotReadiness(lot: OpsLot) {
  if (["HELD", "REVOKED", "TRANSFORMED", "DEPLETED"].includes(lot.status)) {
    return { step: 6, action: "Keep unlisted", blocker: `Lot is ${lot.status.toLowerCase()}. Eligibility is closed.`, tone: "stopped" };
  }
  if (lot.status === "NOT_QUALIFIED") {
    return { step: 5, action: "Keep decision private", blocker: "Decision did not qualify. No public listing is permitted.", tone: "private" };
  }
  if (lot.status === "INSUFFICIENT_EVIDENCE") {
    return { step: 5, action: "Resolve evidence gap", blocker: "Current evidence is insufficient for this frozen profile.", tone: "attention" };
  }
  if (!inventoryVerified(lot)) {
    return { step: 1, action: "Verify inventory facts", blocker: "Identity, quantity, location, and authority stamps are required.", tone: "attention" };
  }
  if (!lot.samplingStatus) {
    return { step: 2, action: "Create sampling order", blocker: "No sampling workflow is attached to this physical lot.", tone: "attention" };
  }
  if (lot.samplingStatus === "CANCELLED") {
    return { step: 2, action: "Review cancelled sampling", blocker: "Sampling ended before a completed custody record.", tone: "stopped" };
  }
  if (lot.samplingStatus !== "COMPLETED") {
    const actionByStatus = {
      REQUESTED: "Schedule independent sampling",
      SCHEDULED: "Record sample collection",
      COLLECTED: "Ship sealed sample",
      SHIPPED: "Confirm laboratory receipt",
      RECEIVED: "Complete custody workflow",
    } as const;
    return { step: 2, action: actionByStatus[lot.samplingStatus], blocker: `Sampling order is ${lot.samplingStatus.toLowerCase()}.`, tone: "active" };
  }
  if (!lot.evidenceStatus) {
    return { step: 4, action: "Verify TECRID evidence", blocker: "Sampling is complete; authenticated evidence has not arrived.", tone: "attention" };
  }
  if (lot.evidenceStatus !== "CURRENT") {
    return { step: 4, action: "Attach replacement evidence", blocker: "The attached TECRID evidence is revoked. The physical lot remains eligible for re-evidence.", tone: "attention" };
  }
  if (lot.status === "EVIDENCE_RECEIVED") {
    return { step: 5, action: "Run deterministic qualification", blocker: "Current replacement evidence requires a new immutable decision.", tone: "active" };
  }
  if (!lot.decisionOutcome) {
    return { step: 5, action: "Run deterministic qualification", blocker: "Current evidence is ready for the frozen profile rules.", tone: "active" };
  }
  if (lot.decisionOutcome !== "QUALIFIED") {
    return { step: 5, action: "Keep decision private", blocker: "Only a QUALIFIED decision can reach publication.", tone: "private" };
  }
  if (lot.listingStatus !== "LISTED") {
    return { step: 6, action: "Publish passed lot", blocker: "Truth spine is complete; publication still requires an ops action.", tone: "active" };
  }
  return { step: 6, action: "Monitor listing eligibility", blocker: "Public now. Watch evidence currency and inventory state.", tone: "ready" };
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(value);
}

export default async function OpsPage() {
  const actor = await getCurrentActor();
  if (!actor.roles.some((role) => role === "OPS" || role === "ADMIN")) {
    return (
      <main id="main-content" className="accessPage">
        <div className="accessCard"><span className="mono">AUTHZ / OPS</span><h1>Operations access required.</h1><p>Your active VLE organization membership does not include an operations role.</p><Link className="textLink" href="/">Return to the public shelf</Link></div>
      </main>
    );
  }

  const [lots, events, lanes] = await Promise.all([listOpsLots(), listAuditEvents(12), listPilotLanes()]);
  const listedCount = lots.filter((lot) => lot.listingStatus === "LISTED").length;
  const activeCount = lots.filter((lot) => !["NOT_QUALIFIED", "HELD", "REVOKED", "TRANSFORMED", "DEPLETED"].includes(lot.status)).length;
  const needsAction = lots.filter((lot) => ["active", "attention"].includes(lotReadiness(lot).tone)).length;

  return (
    <main id="main-content" className="opsPage">
      <section className="opsHero">
        <div>
          <p className="eyebrow">Managed cocoa + avocado fruit pilots</p>
          <h1>Operations board</h1>
          <p className="sectionLead">Move real physical lots through inventory verification, controlled sampling, authenticated evidence, qualification, and gated publication.</p>
        </div>
        <span className="roleBadge">{actor.roles.join(" · ")}</span>
      </section>

      <section className="opsMetrics" aria-label="Pilot pipeline summary">
        <div><span>Pipeline lots</span><strong>{lots.length.toString().padStart(2, "0")}</strong><small>Across two controlled lanes</small></div>
        <div><span>Active lane</span><strong>{activeCount.toString().padStart(2, "0")}</strong><small>Not terminal or private-fail</small></div>
        <div><span>Action queue</span><strong>{needsAction.toString().padStart(2, "0")}</strong><small>Next step is named below</small></div>
        <div className="metricLive"><span>Public shelf</span><strong>{listedCount.toString().padStart(2, "0")}</strong><small>Gate-cleared listings</small></div>
      </section>

      <section className="laneOverview" aria-label="Pilot lane readiness">
        {lanes.map((lane) => {
          const laneLots = lots.filter(({ productCode }) => productCode === lane.productCode);
          const publicCount = laneLots.filter(({ listingStatus }) => listingStatus === "LISTED").length;
          return <article key={lane.productTypeId}><div><span className="mono">{lane.productCode.replaceAll("_", " / ")}</span><h2>{lane.product}</h2></div><dl><div><dt>Frozen profile</dt><dd>{lane.profileName} v{lane.profileVersion}</dd></div><div><dt>Ops queue</dt><dd>{laneLots.length} lots</dd></div><div><dt>Public</dt><dd>{publicCount} listed</dd></div></dl>{lane.productCode === "AVOCADO_FRUIT" ? <p>Fruit only · no oil marketplace · matching remains cocoa-only.</p> : <p>Phase B matching and commercial intent remain enabled for cocoa only.</p>}</article>;
        })}
      </section>

      <section className="commercialCallout" aria-labelledby="commercial-heading">
        <div><p className="eyebrow">Phase B · Commercial intent</p><h2 id="commercial-heading">Requirement → match → quote → reservation intent</h2><p>Run the buyer and supplier handoff without creating an Order or allowing commercial records to override listing eligibility.</p></div>
        <Link className="button" href="/ops/commercial">Open commercial board</Link>
      </section>

      <section className="opsBoard" aria-labelledby="pipeline-heading">
        <div className="boardHeading">
          <div><p className="eyebrow">Truth-spine queue</p><h2 id="pipeline-heading">Physical lots</h2></div>
          <p>Open a lot to perform its next allowed action. Server authorization and state-machine checks remain authoritative.</p>
        </div>

        {lots.length ? (
          <div className="opsLotList">
            {lots.map((lot) => {
              const readiness = lotReadiness(lot);
              const walkthrough = lot.lotCode.includes("DEMO-NOMINATED") && !["HELD", "REVOKED", "TRANSFORMED", "DEPLETED"].includes(lot.status);
              return (
                <article className={`opsLotRow tone-${readiness.tone}`} key={lot.id}>
                  <div className="opsLotIdentity">
                    <div className="opsLotFlags">
                      <span className={`stateChip state-${lot.status.toLowerCase()}`}>{lot.status.replaceAll("_", " ")}</span>
                      {walkthrough ? <span className="walkthroughChip">Walkthrough lane</span> : null}
                    </div>
                    <p className="productLabel">{lot.product}</p><h3>{lot.lotCode}</h3>
                    <p>{lot.supplier} · {lot.location}, {lot.countryCode}</p>
                  </div>
                  <div className="opsLotInventory"><span>Inventory</span><strong>{formatQuantity(lot.quantity)} {lot.quantityUnit}</strong><small>{inventoryVerified(lot) ? "Four facts verified" : "Verification pending"}</small></div>
                  <div className="opsLotProgress">
                    <div><span>Stage {readiness.step} of 6</span><span>{Math.round((readiness.step / 6) * 100)}%</span></div>
                    <div className="progressTrack"><i style={{ width: `${(readiness.step / 6) * 100}%` }} /></div>
                    <strong>{readiness.action}</strong>
                    <p>{readiness.blocker}</p>
                  </div>
                  <Link className="openLot" href={`/ops/lots/${lot.id}`}><span>Open lot</span><span aria-hidden="true">→</span></Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="opsEmpty"><span className="mono">QUEUE / READY</span><h3>Waiting on the first nomination.</h3><p>The workflow is ready. A supplier must nominate a stocked physical cocoa or avocado fruit lot before inventory verification and sampling can begin.</p></div>
        )}
      </section>

      <section className="auditPanel" aria-labelledby="audit-heading">
        <div className="boardHeading"><div><p className="eyebrow">Append-only record</p><h2 id="audit-heading">Audit history</h2></div><p>Compliance-critical events are hash-chained and cannot be edited or deleted.</p></div>
        {events.length ? (
          <ol className="auditList">
            {events.map((event) => <li key={event.id}><span className="auditSignal" aria-hidden="true" /><div><strong>{event.eventType.replaceAll("_", " ")}</strong><span>{event.entityType} · {event.entityId.slice(0, 8)}</span></div><time>{formatTime(event.createdAt)}</time></li>)}
          </ol>
        ) : <div className="opsEmpty compact"><h3>Audit rail ready.</h3><p>The first compliance-critical event will appear here.</p></div>}
      </section>
    </main>
  );
}
