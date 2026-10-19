import Link from "next/link";
import {getCurrentPageActor} from "@/lib/page-actor";
import {Inbox} from "@/components/fieldwork/inbox";
export default async function Page(){const actor=await getCurrentPageActor();return <main id="main-content" className="fw-container fw-page"><div className="fw-breadcrumb"><Link href="/dashboard/supplier">Supplier workspace</Link><span>/</span><span>Inbox</span></div><h1>Conversations worth having.</h1><p className="fw-page-lead">Sample, quote and document requests, with the details buyers supplied.</p><Inbox actor={actor} view="SUPPLIER"/></main>}
