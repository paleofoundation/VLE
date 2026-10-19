import Link from "next/link";
import { publicCatalog } from "@/services/marketplace";
import { Card, EmptyState, Button } from "@/components/fieldwork/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Claim your supplier profile", alternates: { canonical: "https://vle.exchange/claim" } };
export default async function ClaimIndex({ searchParams }: { searchParams: Promise<{q?: string}> }) {
  const q = (await searchParams).q?.slice(0, 100) ?? "";
  const profiles = (await publicCatalog()).filter(p => !p.member && p.name.toLowerCase().includes(q.toLowerCase()));
  return <main id="main-content" className="fw-container fw-page"><p className="fw-eyebrow">YOUR COMPANY. YOUR RECORD.</p><h1>Make the listing yours.</h1><p className="fw-page-lead">Find your company and verify your authority to manage its profile. Your primary account email is checked against the company domain.</p><form className="fw-search" method="get"><label className="sr-only" htmlFor="claim-search">Company name</label><input id="claim-search" name="q" defaultValue={q} placeholder="Find your company" maxLength={100}/><Button>Search profiles</Button></form><div className="fw-supplier-grid">{profiles.map(p=><Card key={p.slug}><p className="fw-eyebrow">{p.country}</p><h2>{p.name}</h2><p className="fw-muted">{p.category}</p><Link className="fw-button fw-secondary" href={`/claim/${p.slug}`}>Claim this profile</Link></Card>)}</div>{!profiles.length?<EmptyState title="No public profiles match."><Link href="/onboarding">List your company</Link></EmptyState>:null}<p className="fw-fineprint">Claims and takedowns are honoured within 5 business days. <a href="mailto:marcus@vle.exchange">marcus@vle.exchange</a></p></main>;
}
