import {BrandRequirements} from "@/components/fieldwork/brand-requirements";
import {Reservations} from "@/components/fieldwork/reservations";
import Link from "next/link";
import {getCurrentPageActor} from "@/lib/page-actor";
import {Inbox} from "@/components/fieldwork/inbox";
import {EmptyState} from "@/components/fieldwork/ui";
export default async function Brand(){const actor=await getCurrentPageActor();return <main id="main-content" className="fw-container fw-page"><div className="fw-section-heading"><div><p className="fw-eyebrow">BRAND WORKSPACE</p><h1>Your sourcing desk.</h1></div><Link className="fw-text-link" href="/suppliers">Explore suppliers</Link></div><h2>Your requests</h2>{actor.roles.includes("BUYER")?<><Inbox actor={actor} view="BUYER"/><BrandRequirements actor={actor}/><section id="reservations" style={{marginTop:48}}><h2>Qualified lot reservations</h2><Reservations actor={actor}/></section></>:<EmptyState title="A brand account is required."><Link href="/dashboard/supplier">Open supplier workspace</Link></EmptyState>}</main>}
