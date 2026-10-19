import {eq,sql} from "drizzle-orm";
import Link from "next/link";
import {getDb} from "@/db";
import {marketplaceEvents} from "@/db/market-schema";
import {getCurrentPageActor} from "@/lib/page-actor";
import {ownSupplierProfile} from "@/services/certifications";
import {Table,EmptyState} from "@/components/fieldwork/ui";
export default async function Analytics(){const p=await ownSupplierProfile(await getCurrentPageActor());const rows=await getDb().select({day:marketplaceEvents.day,kind:marketplaceEvents.kind,count:sql<number>`count(*)::int`}).from(marketplaceEvents).where(eq(marketplaceEvents.supplierSlug,p.slug)).groupBy(marketplaceEvents.day,marketplaceEvents.kind).orderBy(marketplaceEvents.day);return <main id="main-content" className="fw-container fw-page"><div className="fw-breadcrumb"><Link href="/dashboard/supplier">Workspace</Link><span>/</span><span>Who viewed</span></div><h1>A view of your reach.</h1><p className="fw-page-lead">Profile views and document opens recorded by VLE. Anonymous daily counts, without visitor identities.</p>{rows.length?<Table caption="VLE recorded daily events"><thead><tr><th>Date</th><th>Event</th><th>Recorded views</th></tr></thead><tbody>{rows.map(x=><tr key={`${x.day}-${x.kind}`}><td>{x.day}</td><td>{x.kind}</td><td>{x.count}</td></tr>)}</tbody></Table>:<EmptyState title="No views recorded yet."><p>Only actual VLE events appear here.</p></EmptyState>}</main>}
