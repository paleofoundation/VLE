import Link from "next/link";
import { getCurrentActor } from "@/lib/current-actor";
import { listAuditEvents, listOpsLots } from "@/services/vle";

export const dynamic = "force-dynamic";

export default async function OpsPage() {
  const actor = await getCurrentActor();
  if (!actor.roles.some((role) => role === "OPS" || role === "ADMIN")) {
    return <main className="narrow"><div className="notice"><strong>Operations access required</strong><p>Your VLE organization membership does not include an operations role.</p></div></main>;
  }
  const [lots, events] = await Promise.all([listOpsLots(), listAuditEvents(12)]);
  return <main className="section opsPage">
    <div className="sectionHeading"><div><p className="eyebrow">Managed operations</p><h1>Phase A control room</h1></div><span className="roleBadge">{actor.roles.join(" · ")}</span></div>
    <p className="lede compact">Run the auditable workflow. State-changing controls re-check role authorization on the server.</p>
    <section className="panel"><h2>Physical lots</h2><div className="tableWrap"><table><thead><tr><th>Lot</th><th>Supplier</th><th>Inventory</th><th>State</th><th /></tr></thead><tbody>{lots.map((lot) => <tr key={lot.id}><td>{lot.lotCode}</td><td>{lot.supplier}</td><td>{lot.quantity} {lot.quantityUnit}</td><td><span className="pill">{lot.status}</span></td><td><Link href={`/ops/lots/${lot.id}`}>Open →</Link></td></tr>)}</tbody></table></div></section>
    <section className="panel"><h2>Immutable audit history</h2><ol className="auditList">{events.map((event) => <li key={event.id}><div><strong>{event.eventType.replaceAll("_", " ")}</strong><span>{event.entityType} · {event.entityId.slice(0, 8)}</span></div><time>{event.createdAt.toLocaleString()}</time></li>)}</ol></section>
  </main>;
}
