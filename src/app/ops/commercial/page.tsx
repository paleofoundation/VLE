import Link from "next/link";
import { matchRequirementAction } from "@/app/commercial-actions";
import { getCurrentPageActor } from "@/lib/page-actor";
import { formatQuantity } from "@/lib/presentation";
import { listCommercialWorkspace } from "@/services/commercial";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(value);
}

export default async function CommercialOpsPage() {
  const actor = await getCurrentPageActor();
  if (!actor.roles.some((role) => role === "OPS" || role === "ADMIN")) {
    return <main id="main-content" className="accessPage"><div className="accessCard"><span className="mono">AUTHZ / OPS</span><h1>Operations access required.</h1><Link className="textLink" href="/">Return to the public shelf</Link></div></main>;
  }
  const workspace = await listCommercialWorkspace(actor, "OPS");
  return (
    <main id="main-content" className="commercialPage">
      <section className="commercialHero">
        <div><p className="eyebrow">Managed cocoa pilot · Phase B</p><h1>Commercial intent board</h1><p className="sectionLead">Run eligible-listing matches, then move supplier quotes and buyer reservation intents without creating an Order.</p></div>
        <Link className="textLink" href="/ops">← Compliance operations</Link>
      </section>
      <section className="opsMetrics" aria-label="Commercial pipeline summary">
        <div><span>Requirements</span><strong>{workspace.requirements.length.toString().padStart(2, "0")}</strong><small>Buyer needs recorded</small></div>
        <div><span>Active matches</span><strong>{workspace.matches.filter(({ status }) => status === "ACTIVE").length.toString().padStart(2, "0")}</strong><small>Eligible public listings only</small></div>
        <div><span>Open quotes</span><strong>{workspace.quotes.filter(({ status }) => status === "DRAFT" || status === "SENT").length.toString().padStart(2, "0")}</strong><small>Expiry enforced</small></div>
        <div className="metricLive"><span>Active intents</span><strong>{workspace.reservations.filter(({ status }) => status === "ACTIVE").length.toString().padStart(2, "0")}</strong><small>Not Orders</small></div>
      </section>
      <section className="commercialBoard">
        <div className="boardHeading"><div><p className="eyebrow">Requirement queue</p><h2>Find a currently passing lot</h2></div><p>Matching binds the exact frozen profile version and never reaches private or unlisted lots.</p></div>
        <div className="commercialList">
          {workspace.requirements.map((requirement) => {
            const matches = workspace.matches.filter((match) => match.requirementId === requirement.id);
            return <article className="commercialCard" key={requirement.id}>
              <div className="commercialCardHead"><div><span className="stateChip state-evidence_received">Buyer requirement</span><h3>{formatQuantity(requirement.quantity)} {requirement.quantityUnit} cocoa powder</h3><p>{requirement.buyer} · Deliver to {requirement.destination}</p></div><time>{formatDate(requirement.createdAt)}</time></div>
              <dl className="commercialFacts"><div><dt>Profile</dt><dd>{requirement.profileName} v{requirement.profileVersion}</dd></div><div><dt>Matches</dt><dd>{matches.filter(({ status }) => status === "ACTIVE").length} active</dd></div><div><dt>Quotes</dt><dd>{workspace.quotes.filter((quote) => matches.some((match) => match.id === quote.requirementMatchId)).length}</dd></div></dl>
              <div className="commercialActions"><form action={matchRequirementAction}><input type="hidden" name="requirementId" value={requirement.id} /><button className="button buttonSmall" type="submit">Run eligible match</button></form><Link className="textLink" href="/supplier">Open supplier desk →</Link><Link className="textLink" href="/buyer">Open buyer desk →</Link></div>
            </article>;
          })}
          {!workspace.requirements.length ? <div className="opsEmpty"><h3>Waiting on buyer requirements.</h3><p>The compliance shelf is ready; commercial matching begins only when a cocoa requirement is recorded.</p><Link className="button buttonSmall" href="/find">Record requirement</Link></div> : null}
        </div>
      </section>
    </main>
  );
}
